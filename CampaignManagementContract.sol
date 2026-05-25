// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MilestoneEscrowContract.sol";

/**
 * @title CampaignManagementContract
 * @dev Manages donation campaigns, donor contribution records, milestone proof
 * submissions, and verifier approval or rejection decisions.
 *
 * Donated ETH is not stored in this contract. Every donation is immediately
 * forwarded to MilestoneEscrowContract, where it stays locked until a verifier
 * approves the latest submitted proof.
 *
 * There is intentionally no refund functionality. Donors cannot withdraw.
 */
contract CampaignManagementContract {
    enum CampaignStatus {
        Active,
        ProofSubmitted,
        ProofRejected,
        Approved,
        FundsReleased
    }

    struct Campaign {
        uint256 id;
        string title;
        string description;
        address payable charity;
        uint256 fundingGoal;
        uint256 totalDonated;
        uint256 deadline;
        CampaignStatus status;
        string latestProofURI;
        uint256 proofSubmissionCount;
        string latestRejectionReason;
        bool exists;
    }

    address public admin;
    MilestoneEscrowContract public escrowContract;

    uint256 private campaignCount;

    mapping(address => bool) private verifiers;
    mapping(uint256 => Campaign) private campaigns;
    mapping(uint256 => mapping(address => uint256)) private donations;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed charity,
        string title,
        uint256 fundingGoal,
        uint256 deadline
    );
    event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event ProofSubmitted(uint256 indexed campaignId, string proofURI, uint256 submissionNumber);
    event ProofApproved(uint256 indexed campaignId, address indexed verifier);
    event ProofRejected(uint256 indexed campaignId, address indexed verifier, string reason);
    event FundsReleased(uint256 indexed campaignId, address indexed charity, uint256 amount);
    event VerifierUpdated(address indexed verifier, bool status);
    event EscrowContractUpdated(address indexed escrowContract);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    modifier onlyVerifier() {
        require(msg.sender == admin || verifiers[msg.sender], "Only verifier or admin can call this function");
        _;
    }

    modifier campaignExists(uint256 campaignId) {
        require(campaigns[campaignId].exists, "Campaign does not exist");
        _;
    }

    modifier onlyCampaignCharity(uint256 campaignId) {
        require(campaigns[campaignId].exists, "Campaign does not exist");
        require(msg.sender == campaigns[campaignId].charity, "Only campaign charity can call this function");
        _;
    }

    constructor(address _escrowContract) {
        require(_escrowContract != address(0), "Escrow contract address cannot be zero");

        admin = msg.sender;
        verifiers[msg.sender] = true;
        escrowContract = MilestoneEscrowContract(payable(_escrowContract));

        emit VerifierUpdated(msg.sender, true);
        emit EscrowContractUpdated(_escrowContract);
    }

    /**
     * @dev Creates a new donation campaign.
     * The charity wallet is the only address allowed to submit proof later.
     */
    function createCampaign(
        string memory title,
        string memory description,
        uint256 fundingGoal,
        uint256 deadline,
        address payable charity
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Campaign title cannot be empty");
        require(bytes(description).length > 0, "Campaign description cannot be empty");
        require(fundingGoal > 0, "Funding goal must be greater than zero");
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(charity != address(0), "Charity address cannot be zero");
        require(charity == msg.sender, "Charity address must be the campaign creator");

        campaignCount += 1;
        uint256 campaignId = campaignCount;

        campaigns[campaignId] = Campaign({
            id: campaignId,
            title: title,
            description: description,
            charity: charity,
            fundingGoal: fundingGoal,
            totalDonated: 0,
            deadline: deadline,
            status: CampaignStatus.Active,
            latestProofURI: "",
            proofSubmissionCount: 0,
            latestRejectionReason: "",
            exists: true
        });

        emit CampaignCreated(campaignId, charity, title, fundingGoal, deadline);

        return campaignId;
    }

    /**
     * @dev Accepts a donation and immediately forwards the ETH to escrow.
     * Donations are allowed while the campaign is active or while proof is being
     * reviewed or resubmitted, but never after funds have been released.
     */
    function donate(uint256 campaignId) external payable campaignExists(campaignId) {
        Campaign storage campaign = campaigns[campaignId];

        require(msg.value > 0, "Donation amount must be greater than zero");
        require(block.timestamp <= campaign.deadline, "Campaign deadline has passed");
        require(
            campaign.status == CampaignStatus.Active ||
                campaign.status == CampaignStatus.ProofSubmitted ||
                campaign.status == CampaignStatus.ProofRejected,
            "Campaign is not accepting donations"
        );
        require(!escrowContract.isReleased(campaignId), "Campaign funds already released");

        campaign.totalDonated += msg.value;
        donations[campaignId][msg.sender] += msg.value;

        escrowContract.depositFunds{value: msg.value}(campaignId);

        emit DonationReceived(campaignId, msg.sender, msg.value);
    }

    /**
     * @dev Allows the campaign charity to submit milestone proof.
     * If proof was rejected before, the charity can submit a new proof URI.
     */
    function submitProof(uint256 campaignId, string memory proofURI) external onlyCampaignCharity(campaignId) {
        Campaign storage campaign = campaigns[campaignId];

        require(bytes(proofURI).length > 0, "Proof URI cannot be empty");
        require(
            campaign.status == CampaignStatus.Active ||
                campaign.status == CampaignStatus.ProofRejected ||
                campaign.status == CampaignStatus.ProofSubmitted,
            "Proof cannot be submitted for this campaign status"
        );
        require(!escrowContract.isReleased(campaignId), "Campaign funds already released");

        campaign.latestProofURI = proofURI;
        campaign.proofSubmissionCount += 1;
        campaign.status = CampaignStatus.ProofSubmitted;

        emit ProofSubmitted(campaignId, proofURI, campaign.proofSubmissionCount);
    }

    /**
     * @dev Approves the latest submitted proof and releases escrowed funds.
     * Only verifier/admin addresses can approve proof.
     */
    function approveProof(uint256 campaignId) external onlyVerifier campaignExists(campaignId) {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.status == CampaignStatus.ProofSubmitted, "Campaign proof is not submitted");

        uint256 releaseAmount = escrowContract.getEscrowBalance(campaignId);
        require(releaseAmount > 0, "No escrowed funds to release");

        campaign.status = CampaignStatus.Approved;

        escrowContract.releaseFunds(campaignId, campaign.charity);

        campaign.status = CampaignStatus.FundsReleased;

        emit ProofApproved(campaignId, msg.sender);
        emit FundsReleased(campaignId, campaign.charity, releaseAmount);
    }

    /**
     * @dev Rejects the latest submitted proof.
     * Funds remain locked in escrow and the charity can submit new proof later.
     */
    function rejectProof(uint256 campaignId, string memory reason) external onlyVerifier campaignExists(campaignId) {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.status == CampaignStatus.ProofSubmitted, "Campaign proof is not submitted");
        require(bytes(reason).length > 0, "Rejection reason cannot be empty");

        campaign.status = CampaignStatus.ProofRejected;
        campaign.latestRejectionReason = reason;

        emit ProofRejected(campaignId, msg.sender, reason);
    }

    /**
     * @dev Adds or removes a verifier address. The admin is a verifier by default.
     */
    function setVerifier(address verifier, bool status) external onlyAdmin {
        require(verifier != address(0), "Verifier address cannot be zero");

        verifiers[verifier] = status;

        emit VerifierUpdated(verifier, status);
    }

    /**
     * @dev Updates the escrow contract address if a new escrow contract is deployed.
     */
    function setEscrowContract(address _escrowContract) external onlyAdmin {
        require(_escrowContract != address(0), "Escrow contract address cannot be zero");

        escrowContract = MilestoneEscrowContract(payable(_escrowContract));

        emit EscrowContractUpdated(_escrowContract);
    }

    /**
     * @dev Returns the full campaign data for Remix testing.
     */
    function getCampaign(uint256 campaignId) external view campaignExists(campaignId) returns (Campaign memory) {
        return campaigns[campaignId];
    }

    /**
     * @dev Returns the total number of campaigns created.
     */
    function getCampaignCount() external view returns (uint256) {
        return campaignCount;
    }

    /**
     * @dev Returns how much a donor has contributed to a campaign.
     */
    function getDonation(uint256 campaignId, address donor) external view campaignExists(campaignId) returns (uint256) {
        return donations[campaignId][donor];
    }

    /**
     * @dev Returns the latest proof URI submitted for a campaign.
     */
    function getLatestProof(uint256 campaignId) external view campaignExists(campaignId) returns (string memory) {
        return campaigns[campaignId].latestProofURI;
    }

    /**
     * @dev Returns whether an address is an approved verifier.
     */
    function isVerifier(address account) external view returns (bool) {
        return account == admin || verifiers[account];
    }

    /**
     * @dev Returns whether a charity address can submit proof for a campaign now.
     */
    function canSubmitProof(uint256 campaignId, address charity) external view campaignExists(campaignId) returns (bool) {
        Campaign storage campaign = campaigns[campaignId];

        return
            charity == campaign.charity &&
            !escrowContract.isReleased(campaignId) &&
            (
                campaign.status == CampaignStatus.Active ||
                campaign.status == CampaignStatus.ProofRejected ||
                campaign.status == CampaignStatus.ProofSubmitted
            );
    }

    /**
     * @dev Returns whether a campaign currently has submitted proof that can be approved.
     */
    function canApproveProof(uint256 campaignId) external view campaignExists(campaignId) returns (bool) {
        return
            campaigns[campaignId].status == CampaignStatus.ProofSubmitted &&
            !escrowContract.isReleased(campaignId) &&
            escrowContract.getEscrowBalance(campaignId) > 0;
    }

    /**
     * @dev Returns the configured escrow contract address.
     */
    function getEscrowAddress() external view returns (address) {
        return address(escrowContract);
    }

    /**
     * @dev Returns the escrow balance for a campaign.
     */
    function getEscrowBalance(uint256 campaignId) external view campaignExists(campaignId) returns (uint256) {
        return escrowContract.getEscrowBalance(campaignId);
    }
}
