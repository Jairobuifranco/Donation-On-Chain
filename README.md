# Donation on Chain

Donation on Chain is a university blockchain prototype for donation accountability. The application lets charities create donation campaigns, lets donors contribute ETH, and uses a milestone escrow process so funds are only released after submitted proof is reviewed and approved by a verifier/admin.

The public version of the application is deployed at:

https://jairobuifranco.github.io/Donation-On-Chain/

To use the deployed application, connect MetaMask to the Sepolia test network and use Sepolia test ETH.

This project was developed for IFB452 by Group 44. The development work for the whole project was divided equally between my partner and I.

## Tech Stack

- **Smart contracts**: Solidity.
- **Backend/application logic**: JavaScript.
- **Frontend**: React/Vite with Bootstrap.
- **File storage**: IPFS for storing uploaded proof files.
- **Blockchain deployment and testing**: Remix and the Sepolia test network.
- **Public deployment**: GitHub Pages.

## Stakeholders

- **Charity**: creates donation campaigns and submits proof showing how the donated funds will be used.
- **Donor**: views campaigns and contributes ETH to campaigns they want to support.
- **Admin/Verifier**: reviews submitted proof, approves or rejects it, and triggers the release of escrowed funds when proof is approved.

## Smart contracts

- **CampaignManagementContract.sol**: manages campaigns, donations, donor records, proof submission, verifier decisions, and campaign status.
- **MilestoneEscrowContract.sol**: securely holds donated ETH and releases funds only after proof is approved.

## Contracts

### MilestoneEscrowContract

The escrow contract only manages funds.

It can:

- Receive ETH only from the trusted campaign management contract.
- Store escrow balances by campaign ID.
- Release funds only when called by the trusted campaign management contract.
- Prevent double release of campaign funds.

It does not manage campaign descriptions, proof details, donor records, or verification decisions.

### CampaignManagementContract

The campaign management contract controls the donation workflow.

It can:

- Create donation campaigns.
- Accept ETH donations and immediately forward them to escrow.
- Track donor contributions.
- Allow the campaign charity to submit proof.
- Allow a verifier/admin to approve or reject proof.
- Release escrowed funds to the charity after proof approval.

## Campaign Status Codes

Remix shows enum values as numbers:

| Code | Status |
|---:|---|
| 0 | Active |
| 1 | ProofSubmitted |
| 2 | ProofRejected |
| 3 | Approved |
| 4 | FundsReleased |

If a campaign has status `4`, it is complete and no more donations can be made to that campaign.

## Run Locally

From the `frontend` folder:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

The frontend uses the contract addresses and ABIs in `frontend/src/contracts/`. If the contracts are redeployed, update those JSON files before running the app.

<details>
<summary>Deployment and Remix Testing Guide</summary>

## Deployment and Remix Testing Guide

### 1. Compile

Use the Solidity compiler version:

```text
0.8.20
```

or another compatible `0.8.x` version.

Compile both contracts.

### 2. Deploy MilestoneEscrowContract First

In the **Deploy & Run Transactions** panel:

1. Select `MilestoneEscrowContract`.
2. Use your first Remix account as the admin.
3. Click **Deploy**.
4. Copy the deployed escrow contract address.

### 3. Deploy CampaignManagementContract

1. Select `CampaignManagementContract`.
2. Paste the deployed escrow contract address into the constructor input.
3. Click **Deploy**.
4. Copy the deployed campaign management contract address.

The deployer of `CampaignManagementContract` becomes:

- `admin`
- default verifier

### 4. Connect Escrow to Campaign Contract

On the deployed `MilestoneEscrowContract`, call:

```text
setCampaignContract(campaignManagementContractAddress)
```

Use the escrow admin account when calling this function.

This step is required. If you skip it, donations will fail because the escrow contract only accepts deposits from the trusted campaign management contract.

You can confirm it worked by calling:

```text
getCampaignContractAddress()
```

### 5. Create a Campaign

Switch to the charity account.

Important: the `charity` address must be the same as the selected Remix account that calls `createCampaign`.

Example values:

```text
title: Food for Children
description: Food for Infants under 16 years old
fundingGoal: 1000000000000000000
deadline: 1780000000
charity: your selected charity account address
```

Funding goal example:

```text
1000000000000000000 = 1 ETH
```

Deadline should be a future Unix timestamp. A useful test value is:

```text
current Unix timestamp + 86400
```

After creating the campaign, call:

```text
getCampaignCount()
```

If it returns `1`, your campaign ID is `1`. If it returns `2`, your new campaign ID is `2`.

### 6. Donate ETH

Switch to a donor account.

The `donate` function only has one visible input:

```text
campaignId
```

The donation amount is not typed inside the function input. Because `donate` is payable, the ETH amount is set in Remix's global **VALUE** field near the top of the **Deploy & Run Transactions** panel.

Set:

```text
VALUE: 100000000000000000
Unit: Wei
```

Then call:

```text
donate(1)
```

or use the correct campaign ID if your campaign is not ID `1`.

Donation amount example:

```text
100000000000000000 = 0.1 ETH
```

You can donate from different Remix donor accounts by switching the selected account and calling `donate(campaignId)` again with a `VALUE`.

### 7. Confirm ETH Is Stored in Escrow

Call this on `CampaignManagementContract`:

```text
getEscrowBalance(campaignId)
```

Or call this on `MilestoneEscrowContract`:

```text
getEscrowBalance(campaignId)
```

After one `0.1 ETH` donation, the result should be:

```text
100000000000000000
```

You can also check a donor contribution:

```text
getDonation(campaignId, donorAddress)
```

### 8. Submit Proof

Switch back to the charity account.

Call:

```text
submitProof(campaignId, "ipfs://example-proof-hash")
```

Other valid proof examples:

```text
https://example.com/receipt.jpg
https://example.com/document.pdf
```

Check the proof:

```text
getLatestProof(campaignId)
```

Check campaign status:

```text
getCampaign(campaignId)
```

Status should now be:

```text
1 = ProofSubmitted
```

### 9. Reject Proof

Switch to the admin/verifier account.

Call:

```text
rejectProof(campaignId, "Receipt is unclear")
```

Funds remain locked in escrow.

Check:

```text
getCampaign(campaignId)
getEscrowBalance(campaignId)
```

Status should now be:

```text
2 = ProofRejected
```

The escrow balance should still show the donated amount.

### 10. Submit New Proof Again

Switch back to the charity account.

Call:

```text
submitProof(campaignId, "https://example.com/receipt.jpg")
```

The contract allows new proof after rejection.

Check:

```text
getCampaign(campaignId)
```

Status should return to:

```text
1 = ProofSubmitted
```

The proof submission count should increase.

### 11. Approve Proof and Release Funds

Switch to the admin/verifier account.

Call:

```text
approveProof(campaignId)
```

This will:

1. Mark proof as approved.
2. Call the escrow contract.
3. Release escrowed ETH to the charity.
4. Mark the campaign as funds released.

Check:

```text
getCampaign(campaignId)
getEscrowBalance(campaignId)
```

On `MilestoneEscrowContract`, also check:

```text
isReleased(campaignId)
```

Expected final values:

```text
status: 4
escrow balance: 0
isReleased: true
```

</details>
