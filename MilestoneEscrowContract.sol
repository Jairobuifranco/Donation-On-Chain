// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MilestoneEscrowContract
 * @dev Holds donated ETH for donation campaigns until the campaign management
 * contract tells it to release funds after proof approval.
 *
 * This contract only manages money. It does not store campaign descriptions,
 * proof details, verifier decisions, or donor records.
 */
contract MilestoneEscrowContract {
    address public admin;
    address private campaignContract;

    mapping(uint256 => uint256) private escrowBalances;
    mapping(uint256 => bool) private released;

    event FundsDeposited(uint256 indexed campaignId, uint256 amount);
    event FundsReleased(uint256 indexed campaignId, address indexed charity, uint256 amount);
    event CampaignContractUpdated(address indexed campaignContract);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }

    modifier onlyCampaignContract() {
        require(msg.sender == campaignContract, "Only campaign contract can call this function");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Sets the trusted CampaignManagementContract address.
     * Only the escrow admin can set or update this address.
     */
    function setCampaignContract(address _campaignContract) external onlyAdmin {
        require(_campaignContract != address(0), "Campaign contract address cannot be zero");

        campaignContract = _campaignContract;

        emit CampaignContractUpdated(_campaignContract);
    }

    /**
     * @dev Deposits ETH into escrow for a specific campaign.
     * Only the trusted CampaignManagementContract can call this function.
     */
    function depositFunds(uint256 campaignId) external payable onlyCampaignContract {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        require(!released[campaignId], "Funds already released for this campaign");

        escrowBalances[campaignId] += msg.value;

        emit FundsDeposited(campaignId, msg.value);
    }

    /**
     * @dev Releases all escrowed ETH for a campaign to the charity address.
     * Uses checks-effects-interactions to prevent re-entrancy issues.
     */
    function releaseFunds(uint256 campaignId, address payable charity) external onlyCampaignContract {
        require(charity != address(0), "Charity address cannot be zero");
        require(!released[campaignId], "Funds already released for this campaign");

        uint256 amount = escrowBalances[campaignId];
        require(amount > 0, "No funds available for this campaign");

        released[campaignId] = true;
        escrowBalances[campaignId] = 0;

        (bool success, ) = charity.call{value: amount}("");
        require(success, "ETH transfer to charity failed");

        emit FundsReleased(campaignId, charity, amount);
    }

    /**
     * @dev Returns the ETH currently held for a campaign.
     */
    function getEscrowBalance(uint256 campaignId) external view returns (uint256) {
        return escrowBalances[campaignId];
    }

    /**
     * @dev Returns whether funds for a campaign have already been released.
     */
    function isReleased(uint256 campaignId) external view returns (bool) {
        return released[campaignId];
    }

    /**
     * @dev Returns the trusted CampaignManagementContract address.
     */
    function getCampaignContractAddress() external view returns (address) {
        return campaignContract;
    }

    /**
     * @dev Rejects direct ETH transfers because deposits must include a campaign ID.
     */
    receive() external payable {
        revert("Use depositFunds through the campaign contract");
    }

    /**
     * @dev Rejects calls to unknown functions.
     */
    fallback() external payable {
        revert("Invalid escrow contract call");
    }
}
