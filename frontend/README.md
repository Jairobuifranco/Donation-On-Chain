# Donation on Chain Frontend

React + Vite frontend for Donation on Chain.

The UI mainly talks to `CampaignManagementContract`. The escrow contract stays behind the scenes because donations and fund releases are already routed through the campaign contract.

## Install Commands

From this folder:

```bash
npm install
```

If you are creating the frontend manually from scratch, the equivalent dependencies are:

```bash
npm install react react-dom vite @vitejs/plugin-react bootstrap ethers
```

## File Structure

```text
frontend/
  index.html
  package.json
  README.md
  vite.config.js
  src/
    App.jsx
    main.jsx
    index.css
    components/
      Navbar.jsx
      CampaignCard.jsx
      CreateCampaignForm.jsx
      DonateForm.jsx
      SubmitProofForm.jsx
      VerifierActions.jsx
    contracts/
      CampaignManagementContract.json
      MilestoneEscrowContract.json
    utils/
      contract.js
```

## Add Contract Address and ABI

Open:

```text
src/contracts/CampaignManagementContract.json
```

Paste your deployed campaign management contract address into `address`, and paste the ABI array into `abi`.

Example shape:

```json
{
  "address": "0xYourCampaignManagementContractAddress",
  "abi": [
    {
      "type": "function",
      "name": "getCampaignCount"
    }
  ]
}
```

Do the same for:

```text
src/contracts/MilestoneEscrowContract.json
```

The current frontend mostly uses `CampaignManagementContract`. The escrow JSON is included so you can expand the prototype later if needed.

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

## MetaMask Setup

Use MetaMask as the wallet identity method. The app does not use email/password login, Firebase, JWT, or backend authentication.

If MetaMask is on an unsupported network, the app shows a warning and asks the user to switch to the deployment network.

## Prototype Features

- Connect MetaMask wallet.
- Detect connected account.
- Warn on wrong network.
- Display all campaigns from `getCampaignCount()` and `getCampaign(id)`.
- Create campaigns.
- Donate ETH to campaigns.
- Submit proof URI/hash as the charity.
- Reject proof as verifier/admin.
- Approve proof as verifier/admin.
- Show escrow balance for each campaign.
- Show campaign status with Bootstrap badges.
