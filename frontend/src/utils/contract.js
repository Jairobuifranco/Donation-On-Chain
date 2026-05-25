import { ethers } from "ethers";
import campaignContractConfig from "../contracts/CampaignManagementContract.json";
import escrowContractConfig from "../contracts/MilestoneEscrowContract.json";

export const DEPLOYMENT_CHAIN_ID = 11155111;
export const DEPLOYMENT_CHAIN_ID_HEX = "0xaa36a7";

export const STATUS_LABELS = {
  0: "Active",
  1: "Proof Submitted",
  2: "Proof Rejected",
  3: "Approved",
  4: "Funds Released"
};

export const STATUS_BADGES = {
  0: "text-bg-primary",
  1: "text-bg-warning",
  2: "text-bg-danger",
  3: "text-bg-info",
  4: "text-bg-success"
};

export function hasMetaMask() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export function getProvider() {
  if (!hasMetaMask()) {
    throw new Error("MetaMask is not installed.");
  }

  return new ethers.BrowserProvider(window.ethereum);
}

export async function getSigner() {
  const provider = getProvider();
  return provider.getSigner();
}

export async function getWalletSnapshot(requestAccounts = false) {
  const provider = getProvider();
  const accounts = await provider.send(requestAccounts ? "eth_requestAccounts" : "eth_accounts", []);
  const network = await provider.getNetwork();

  return {
    account: accounts[0] || "",
    chainId: Number(network.chainId)
  };
}

export async function connectWallet() {
  return getWalletSnapshot(true);
}

export async function requestWalletAccountChange() {
  if (!hasMetaMask()) {
    throw new Error("MetaMask is not installed.");
  }

  if (window.ethereum.request) {
    try {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }]
      });
    } catch (error) {
      if (error?.code !== -32601) {
        throw error;
      }
    }
  }

  return connectWallet();
}

export async function requireWalletConnection() {
  const currentWallet = await getWalletSnapshot(false);

  if (currentWallet.account) {
    return currentWallet;
  }

  return connectWallet();
}

function validateContractConfig(config, contractName) {
  if (!config.address || config.address.includes("PASTE_")) {
    throw new Error(`Add the deployed ${contractName} address in src/contracts/${contractName}.json.`);
  }

  if (!Array.isArray(config.abi) || config.abi.length === 0) {
    throw new Error(`Add the ${contractName} ABI array in src/contracts/${contractName}.json.`);
  }
}

export function getCampaignContract(providerOrSigner) {
  validateContractConfig(campaignContractConfig, "CampaignManagementContract");
  return new ethers.Contract(
    campaignContractConfig.address,
    campaignContractConfig.abi,
    providerOrSigner
  );
}

export function getEscrowContract(providerOrSigner) {
  validateContractConfig(escrowContractConfig, "MilestoneEscrowContract");
  return new ethers.Contract(
    escrowContractConfig.address,
    escrowContractConfig.abi,
    providerOrSigner
  );
}

export function normalizeCampaign(rawCampaign, escrowBalanceWei) {
  const status = Number(rawCampaign.status ?? rawCampaign[7]);

  return {
    id: Number(rawCampaign.id ?? rawCampaign[0]),
    title: rawCampaign.title ?? rawCampaign[1],
    description: rawCampaign.description ?? rawCampaign[2],
    charity: rawCampaign.charity ?? rawCampaign[3],
    fundingGoal: rawCampaign.fundingGoal ?? rawCampaign[4],
    totalDonated: rawCampaign.totalDonated ?? rawCampaign[5],
    deadline: Number(rawCampaign.deadline ?? rawCampaign[6]),
    status,
    latestProofURI: rawCampaign.latestProofURI ?? rawCampaign[8],
    proofSubmissionCount: Number(rawCampaign.proofSubmissionCount ?? rawCampaign[9]),
    latestRejectionReason: rawCampaign.latestRejectionReason ?? rawCampaign[10],
    exists: Boolean(rawCampaign.exists ?? rawCampaign[11]),
    escrowBalance: escrowBalanceWei ?? 0n
  };
}

export function formatEth(valueWei) {
  try {
    return ethers.formatEther(valueWei ?? 0n);
  } catch {
    return "0";
  }
}

export function parseEth(value) {
  return ethers.parseEther(value || "0");
}

export function statusLabel(status) {
  return STATUS_LABELS[Number(status)] ?? "Unknown";
}

export function statusBadgeClass(status) {
  return STATUS_BADGES[Number(status)] ?? "text-bg-secondary";
}

export function shortenAddress(address) {
  if (!address) {
    return "Not connected";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatAddress(address) {
  return shortenAddress(address);
}

export function isSameAddress(first, second) {
  return Boolean(first && second && first.toLowerCase() === second.toLowerCase());
}

export function isCampaignOwner(campaign, account) {
  return isSameAddress(account, campaign?.charity);
}

export async function isCurrentWalletVerifier(account, providerOrSigner = getProvider()) {
  if (!account) {
    return false;
  }

  const contract = getCampaignContract(providerOrSigner);
  return Boolean(await contract.isVerifier(account));
}

export function isCampaignOpenForDonations(campaign) {
  const allowedStatus = [0, 1, 2].includes(Number(campaign.status));
  const beforeDeadline = Math.floor(Date.now() / 1000) <= Number(campaign.deadline);
  return allowedStatus && beforeDeadline;
}

export function getFriendlyError(error) {
  return (
    error?.shortMessage ||
    error?.reason ||
    error?.data?.message ||
    error?.message ||
    "The transaction failed."
  );
}

export async function switchToDeploymentNetwork() {
  if (!hasMetaMask()) {
    throw new Error("MetaMask is not installed.");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: DEPLOYMENT_CHAIN_ID_HEX }]
    });
  } catch (error) {
    if (error?.code === 4902) {
      throw new Error("The deployment network is not available in MetaMask. Add it in MetaMask and try again.");
    }

    throw error;
  }
}
