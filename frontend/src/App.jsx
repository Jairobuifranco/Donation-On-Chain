import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "./components/Navbar";
import CampaignCard from "./components/CampaignCard";
import CreateCampaignForm from "./components/CreateCampaignForm";
import {
  DEPLOYMENT_CHAIN_ID,
  STATUS_LABELS,
  canCharitySubmitProof,
  connectWallet as connectWalletWithMetaMask,
  formatEth,
  formatAddress,
  getCampaignContract,
  getFriendlyError,
  getProvider,
  getSigner,
  getWalletSnapshot,
  hasMetaMask,
  isCampaignOwner,
  isCurrentWalletVerifier,
  normalizeCampaign,
  parseEth,
  proofSubmissionMessage,
  requestWalletAccountChange,
  requireWalletConnection,
  statusBadgeClass,
  statusLabel,
  switchToDeploymentNetwork
} from "./utils/contract";

function App() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [isVerifier, setIsVerifier] = useState(false);
  const [activeMode, setActiveMode] = useState("user");
  const [activePage, setActivePage] = useState("userLanding");
  const [isLoading, setIsLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [txMessage, setTxMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isSupportedNetwork = chainId === DEPLOYMENT_CHAIN_ID;

  const sortedCampaigns = useMemo(() => {
    return [...campaigns].sort((first, second) => second.id - first.id);
  }, [campaigns]);

  const charityCampaigns = useMemo(() => {
    return sortedCampaigns.filter((campaign) => isCampaignOwner(campaign, account));
  }, [account, sortedCampaigns]);

  const submittedProofCampaigns = useMemo(() => {
    return sortedCampaigns.filter((campaign) => Number(campaign.status) === 1);
  }, [sortedCampaigns]);

  const visibleStatusOptions = useMemo(() => {
    const statuses = new Set(sortedCampaigns.map((campaign) => Number(campaign.status)));
    return [...statuses].sort((first, second) => first - second);
  }, [sortedCampaigns]);

  const pageTitle = useMemo(() => {
    if (activePage === "donor") {
      return "Donate";
    }

    if (activePage === "charity") {
      return "Create a Charity";
    }

    if (activePage === "adminDashboard") {
      return "Verify";
    }

    return activeMode === "admin" ? "Admin" : "User";
  }, [activeMode, activePage]);

  const readWalletSnapshot = useCallback(async (requestAccounts = false) => {
    if (!hasMetaMask()) {
      throw new Error("MetaMask is not installed. Install MetaMask to use this prototype.");
    }

    const wallet = await getWalletSnapshot(requestAccounts);
    const selectedAccount = wallet.account;
    const selectedChainId = wallet.chainId;

    setAccount(selectedAccount);
    setChainId(selectedChainId);

    return {
      account: selectedAccount,
      chainId: selectedChainId
    };
  }, []);

  const refreshWalletState = useCallback(async () => {
    try {
      return await readWalletSnapshot(false);
    } catch (err) {
      setError(getFriendlyError(err));
      return null;
    }
  }, [readWalletSnapshot]);

  const connectWallet = useCallback(async () => {
    try {
      setError("");
      const snapshot = await connectWalletWithMetaMask();
      setAccount(snapshot.account);
      setChainId(snapshot.chainId);
      return snapshot;
    } catch (err) {
      setError(getFriendlyError(err));
      return null;
    }
  }, [readWalletSnapshot]);

  const changeWalletAccount = useCallback(async () => {
    try {
      setError("");
      const snapshot = await requestWalletAccountChange();
      setAccount(snapshot.account);
      setChainId(snapshot.chainId);
      setTxMessage(snapshot.account ? `Connected wallet: ${formatAddress(snapshot.account)}` : "");
      return snapshot;
    } catch (err) {
      setError(getFriendlyError(err));
      return null;
    }
  }, []);

  function disconnectWallet() {
    setAccount("");
    setIsVerifier(false);
    setActiveMode("user");
    setActivePage("userLanding");
    setError("");
    setTxMessage("Wallet disconnected from this app session.");
    setTxHash("");
  }

  const fetchCampaigns = useCallback(async (walletAccount) => {
    const provider = getProvider();
    const contract = getCampaignContract(provider);
    const count = Number(await contract.getCampaignCount());
    const loadedCampaigns = [];

    for (let id = 1; id <= count; id += 1) {
      const rawCampaign = await contract.getCampaign(id);
      const escrowBalance = await contract.getEscrowBalance(id);
      loadedCampaigns.push(normalizeCampaign(rawCampaign, escrowBalance));
    }

    const verifierStatus = walletAccount ? await contract.isVerifier(walletAccount) : false;
    setCampaigns(loadedCampaigns);
    setIsVerifier(Boolean(verifierStatus));

    return loadedCampaigns;
  }, []);

  const loadCampaigns = useCallback(async () => {
    if (!hasMetaMask()) {
      setCampaigns([]);
      setIsVerifier(false);
      return;
    }

    if (!isSupportedNetwork) {
      setIsVerifier(false);
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      await fetchCampaigns(account);
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setIsLoading(false);
    }
  }, [account, fetchCampaigns, isSupportedNetwork]);

  async function requireWalletForAction() {
    try {
      setError("");

      setTxMessage("Connect MetaMask to continue.");
      const snapshot = await requireWalletConnection();
      setAccount(snapshot.account);
      setChainId(snapshot.chainId);
      setTxMessage("");

      return snapshot;
    } catch (err) {
      setTxMessage("");
      setError(getFriendlyError(err));
      return null;
    }
  }

  function handleSelectMode(mode) {
    setActiveMode(mode);
    setActivePage(mode === "admin" ? "adminLanding" : "userLanding");
    setError("");
    setTxMessage("");
    setTxHash("");
    setCampaignSearch("");
    setStatusFilter("all");
  }

  async function handleUserChoice(page) {
    const snapshot = await requireWalletForAction();

    if (!snapshot?.account) {
      return;
    }

    setActiveMode("user");
    setActivePage(page);
    setCampaignSearch("");
    setStatusFilter("all");

    if (snapshot.chainId !== DEPLOYMENT_CHAIN_ID) {
      setError("Your wallet is connected to an unsupported network.");
    }
  }

  async function handleStartAdminVerification() {
    const snapshot = await requireWalletForAction();

    if (!snapshot?.account) {
      return;
    }

    if (snapshot.chainId !== DEPLOYMENT_CHAIN_ID) {
      setError("Your wallet is connected to an unsupported network.");
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const verifierStatus = await isCurrentWalletVerifier(snapshot.account);

      setIsVerifier(verifierStatus);

      if (!verifierStatus) {
        setError("This wallet is not authorised as a verifier.");
        return;
      }

      setActiveMode("admin");
      setActivePage("adminDashboard");
      setCampaignSearch("");
      setStatusFilter("all");
      await fetchCampaigns(snapshot.account);
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function runTransaction(actionLabel, transactionFactory) {
    try {
      setIsBusy(true);
      setError("");
      setTxHash("");
      setTxMessage(`${actionLabel}: waiting for wallet confirmation...`);

      const tx = await transactionFactory();
      setTxHash(tx.hash);
      setTxMessage(`${actionLabel}: transaction sent (${tx.hash}). Waiting for confirmation...`);

      await tx.wait();
      setTxMessage(`${actionLabel}: confirmed.`);
      await loadCampaigns();
    } catch (err) {
      setError(getFriendlyError(err));
      setTxMessage("");
      setTxHash("");
    } finally {
      setIsBusy(false);
    }
  }

  function findCampaign(campaignId) {
    return campaigns.find((campaign) => Number(campaign.id) === Number(campaignId));
  }

  async function requireSupportedWallet() {
    const snapshot = await requireWalletForAction();

    if (!snapshot?.account) {
      return null;
    }

    if (snapshot.chainId !== DEPLOYMENT_CHAIN_ID) {
      setError("Your wallet is connected to an unsupported network.");
      return null;
    }

    return snapshot;
  }

  async function handleCreateCampaign({ title, description, fundingGoalWei, deadlineTimestamp, charity }) {
    const snapshot = await requireSupportedWallet();

    if (!snapshot) {
      return;
    }

    if (snapshot.account.toLowerCase() !== charity.toLowerCase()) {
      setError("Use the connected wallet as the charity wallet for this campaign.");
      return;
    }

    await runTransaction("Create campaign", async () => {
      const signer = await getSigner();
      const contract = getCampaignContract(signer);
      return contract.createCampaign(title, description, fundingGoalWei, deadlineTimestamp, charity);
    });
  }

  async function handleDonate(campaignId, amountEth) {
    const snapshot = await requireSupportedWallet();

    if (!snapshot) {
      return;
    }

    await runTransaction("Donate", async () => {
      const signer = await getSigner();
      const contract = getCampaignContract(signer);
      return contract.donate(campaignId, { value: parseEth(amountEth) });
    });
  }

  async function handleSubmitProof(campaignId, proofURI) {
    const snapshot = await requireSupportedWallet();
    const campaign = findCampaign(campaignId);

    if (!snapshot) {
      return;
    }

    if (!campaign || !isCampaignOwner(campaign, snapshot.account)) {
      setError("Only the campaign charity can submit proof for this campaign.");
      return;
    }

    if (!canCharitySubmitProof(campaign)) {
      setError(proofSubmissionMessage(campaign));
      return;
    }

    await runTransaction("Submit proof", async () => {
      const signer = await getSigner();
      const contract = getCampaignContract(signer);
      return contract.submitProof(campaignId, proofURI);
    });
  }

  async function handleApproveProof(campaignId) {
    const snapshot = await requireSupportedWallet();
    const campaign = findCampaign(campaignId);

    if (!snapshot) {
      return;
    }

    if (!campaign) {
      setError("Campaign not found. Refresh the campaign list and try again.");
      return;
    }

    if (BigInt(campaign.escrowBalance ?? 0n) === 0n) {
      setError("No escrowed funds to release. The campaign must receive a donation before proof can be approved.");
      return;
    }

    if (!(await isCurrentWalletVerifier(snapshot.account))) {
      setError("This wallet is not authorised as a verifier.");
      return;
    }

    await runTransaction("Approve proof", async () => {
      const signer = await getSigner();
      const contract = getCampaignContract(signer);
      return contract.approveProof(campaignId);
    });
  }

  async function handleRejectProof(campaignId, reason) {
    const snapshot = await requireSupportedWallet();

    if (!snapshot) {
      return;
    }

    if (!(await isCurrentWalletVerifier(snapshot.account))) {
      setError("This wallet is not authorised as a verifier.");
      return;
    }

    await runTransaction("Reject proof", async () => {
      const signer = await getSigner();
      const contract = getCampaignContract(signer);
      return contract.rejectProof(campaignId, reason);
    });
  }

  async function handleSwitchNetwork() {
    try {
      setError("");
      await switchToDeploymentNetwork();
      await refreshWalletState();
    } catch (err) {
      setError(getFriendlyError(err));
    }
  }

  function handleBackToLanding() {
    setActivePage(activeMode === "admin" ? "adminLanding" : "userLanding");
    setCampaignSearch("");
    setStatusFilter("all");
    setError("");
    setTxMessage("");
    setTxHash("");
  }

  useEffect(() => {
    refreshWalletState();
  }, [refreshWalletState]);

  useEffect(() => {
    if (!hasMetaMask()) {
      return undefined;
    }

    const handleAccountsChanged = () => refreshWalletState();
    const handleChainChanged = () => refreshWalletState();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [refreshWalletState]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  function renderUserLanding() {
    return (
      <>
        <section className="row g-4">
          <div className="col-md-6">
            <div className="card action-card h-100">
              <div className="card-body p-4">
                <div className="feature-icon bg-success-subtle text-success mb-3">
                  <i className="bi bi-cash-coin" aria-hidden="true"></i>
                </div>
                <h2 className="h4">Donate</h2>
                <p className="text-secondary">
                  Support active donation campaigns and track their progress transparently.
                </p>
                <button className="btn btn-success btn-lg" type="button" onClick={() => handleUserChoice("donor")}>
                  <i className="bi bi-heart-fill me-2" aria-hidden="true"></i>
                  Donate
                </button>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card action-card h-100">
              <div className="card-body p-4">
                <div className="feature-icon bg-primary-subtle text-primary mb-3">
                  <i className="bi bi-building-fill" aria-hidden="true"></i>
                </div>
                <h2 className="h4">Create a Charity</h2>
                <p className="text-secondary">
                  Create a donation campaign and submit proof of impact.
                </p>
                <button className="btn btn-primary btn-lg" type="button" onClick={() => handleUserChoice("charity")}>
                  <i className="bi bi-megaphone me-2" aria-hidden="true"></i>
                  Create a Charity
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="how-it-works mt-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-diagram-3 text-primary" aria-hidden="true"></i>
            <h2 className="h5 mb-0">How it works</h2>
          </div>
          <div className="row g-3">
            <div className="col-md-4">
              <div className="step-card">
                <span className="step-number">1</span>
                <i className="bi bi-heart-fill text-success" aria-hidden="true"></i>
                <h3 className="h6 mb-1">Donors fund campaigns</h3>
                <p className="small text-secondary mb-0">Support campaigns with ETH through the connected wallet.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="step-card">
                <span className="step-number">2</span>
                <i className="bi bi-file-earmark-check text-warning" aria-hidden="true"></i>
                <h3 className="h6 mb-1">Charities submit proof</h3>
                <p className="small text-secondary mb-0">Provide an impact URI or document reference for review.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="step-card">
                <span className="step-number">3</span>
                <i className="bi bi-patch-check text-primary" aria-hidden="true"></i>
                <h3 className="h6 mb-1">Verifiers approve release</h3>
                <p className="small text-secondary mb-0">Authorised verifiers approve or reject submitted proof.</p>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  function renderAdminLanding() {
    return (
      <section className="row justify-content-center">
        <div className="col-lg-7">
          <div className="card action-card text-center">
            <div className="card-body p-5">
              <div className="feature-icon bg-dark text-white mx-auto mb-3">
                <i className="bi bi-shield-check" aria-hidden="true"></i>
              </div>
              <h2 className="h4">Admin Verification</h2>
              <p className="text-secondary">
                Review submitted charity proof and approve or reject fund release.
              </p>
              <button className="btn btn-dark btn-lg px-5" type="button" onClick={handleStartAdminVerification}>
                <i className="bi bi-patch-check me-2" aria-hidden="true"></i>
                Verify
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function filterCampaigns(items) {
    const normalizedSearch = campaignSearch.trim().toLowerCase();

    return items.filter((campaign) => {
      const matchesStatus = statusFilter === "all" || Number(campaign.status) === Number(statusFilter);

      if (!normalizedSearch) {
        return matchesStatus;
      }

      const searchable = [
        campaign.title,
        campaign.description,
        campaign.charity,
        String(campaign.id)
      ].join(" ").toLowerCase();

      return matchesStatus && searchable.includes(normalizedSearch);
    });
  }

  function renderCampaignToolbar({ title, items, variant }) {
    const showFilters = variant !== "admin" && items.length > 0;

    return (
      <>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h2 className="h4 mb-1">{title}</h2>
            <div className="text-secondary small">
              Showing {filterCampaigns(items).length} of {items.length} campaigns
            </div>
          </div>
          <button
            className="btn btn-outline-primary btn-sm"
            type="button"
            onClick={loadCampaigns}
            disabled={!isSupportedNetwork || isLoading}
          >
            <i className={`bi ${isLoading ? "bi-arrow-repeat" : "bi-arrow-clockwise"} me-1`} aria-hidden="true"></i>
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {showFilters && (
          <div className="row g-2 mb-3">
            <div className="col-md-8">
              <label className="form-label" htmlFor={`${variant}-campaign-search`}>
                Search campaigns
              </label>
              <input
                id={`${variant}-campaign-search`}
                className="form-control"
                value={campaignSearch}
                onChange={(event) => setCampaignSearch(event.target.value)}
                placeholder="Search by title, description, ID, or charity address"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor={`${variant}-status-filter`}>
                Status
              </label>
              <select
                id={`${variant}-status-filter`}
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                {visibleStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status] ?? "Unknown"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </>
    );
  }

  function renderCampaignList({ title, emptyMessage, items, variant }) {
    const filteredItems = filterCampaigns(items);

    return (
      <section>
        {renderCampaignToolbar({ title, items, variant })}

        {isLoading && <div className="alert alert-light border">Loading campaigns...</div>}

        {!isLoading && items.length === 0 && (
          <div className="alert alert-secondary mb-0">{emptyMessage}</div>
        )}

        {!isLoading && items.length > 0 && filteredItems.length === 0 && (
          <div className="alert alert-secondary mb-0">
            No campaigns match the current search or status filter.
          </div>
        )}

        <div className="campaign-grid">
          {filteredItems.map((campaign) => (
            <CampaignCard
              key={`${variant}-${campaign.id}`}
              campaign={campaign}
              account={account}
              isVerifier={isVerifier}
              isBusy={isBusy}
              variant={variant}
              onDonate={handleDonate}
              onSubmitProof={handleSubmitProof}
              onApproveProof={handleApproveProof}
              onRejectProof={handleRejectProof}
            />
          ))}
        </div>
      </section>
    );
  }

  function renderDonorPage() {
    return renderCampaignList({
      title: "Donation Campaigns",
      emptyMessage: "No campaigns found on this contract yet.",
      items: sortedCampaigns,
      variant: "donor"
    });
  }

  function renderCharityPage() {
    return (
      <>
        <CreateCampaignForm
          account={account}
          onCreateCampaign={handleCreateCampaign}
          disabled={!account || !isSupportedNetwork || isBusy}
        />

        {renderCampaignList({
          title: "My Campaigns",
          emptyMessage: "No campaigns found for the connected charity wallet.",
          items: charityCampaigns,
          variant: "charity"
        })}
      </>
    );
  }

  function renderAdminDashboard() {
    if (!isVerifier) {
      return <div className="alert alert-danger">This wallet is not authorised as a verifier.</div>;
    }

    return renderCampaignList({
      title: "Submitted Proof for Review",
      emptyMessage: "No campaigns currently have submitted proof.",
      items: submittedProofCampaigns,
      variant: "admin"
    });
  }

  function renderCurrentPage() {
    if (activePage === "adminLanding") {
      return renderAdminLanding();
    }

    if (activePage === "donor") {
      return renderDonorPage();
    }

    if (activePage === "charity") {
      return renderCharityPage();
    }

    if (activePage === "adminDashboard") {
      return renderAdminDashboard();
    }

    return renderUserLanding();
  }

  return (
    <div className="app-shell">
      <Navbar
        account={account}
        activeMode={activeMode}
        onSelectMode={handleSelectMode}
        onConnectWallet={connectWallet}
        onChangeAccount={changeWalletAccount}
        onDisconnectWallet={disconnectWallet}
      />

      <header className="page-header">
        <div className="container py-5">
          <div className="row align-items-center g-4">
            <div className="col-lg-8">
              <div className="hero-kicker mb-3">
                <i className="bi bi-boxes me-2" aria-hidden="true"></i>
                Transparent blockchain donations
              </div>
              <h1 className="display-5 fw-bold mb-3">Donation on Chain</h1>
              <p className="lead mb-0">
                A blockchain donation accountability app where donors fund campaigns, charities submit impact proof, and authorised verifiers approve fund release from escrow.
              </p>
            </div>
            <div className="col-lg-4">
              <div className="hero-stat-card">
                <div className="d-flex align-items-center gap-3">
                  <div className="feature-icon bg-success text-white">
                    <i className="bi bi-shield-check" aria-hidden="true"></i>
                  </div>
                  <div>
                    <div className="small text-white-50">Prototype flow</div>
                    <div className="fw-semibold">Donate. Prove. Verify.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-4">
        <div className="workflow-bar d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
          <nav aria-label="Current workflow">
            <span className="text-secondary">
              <i className={`bi ${activeMode === "admin" ? "bi-shield-check" : "bi-person-circle"} me-1`} aria-hidden="true"></i>
              {activeMode === "admin" ? "Admin" : "User"}
            </span>
            <span className="text-secondary mx-2">/</span>
            <span className="fw-semibold">{pageTitle}</span>
          </nav>

          {!["userLanding", "adminLanding"].includes(activePage) && (
            <button className="btn btn-outline-secondary btn-sm" type="button" onClick={handleBackToLanding}>
              <i className="bi bi-arrow-left me-1" aria-hidden="true"></i>
              Back
            </button>
          )}
        </div>

        {!account && (
          <div className="alert alert-info">
            Connect MetaMask before entering the donor, charity, or verifier workflow.
          </div>
        )}

        {chainId && !isSupportedNetwork && (
          <div className="alert alert-warning">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <span>Your wallet is connected to an unsupported network. Switch to the deployment network before sending transactions.</span>
              <button className="btn btn-outline-dark btn-sm" type="button" onClick={handleSwitchNetwork}>
                Switch Network
              </button>
            </div>
          </div>
        )}

        {error && <div className="alert alert-danger">{error}</div>}
        {txMessage && (
          <div className="alert alert-primary">
            <div>{txMessage}</div>
            {txHash && (
              <div className="small mono mt-1">
                Transaction hash: {txHash}
              </div>
            )}
          </div>
        )}

        {renderCurrentPage()}

        {sortedCampaigns.length > 0 && activePage === "donor" && (
          <section className="summary-panel mt-4">
            <h2 className="h5 mb-3">
              <i className="bi bi-safe2 me-2 text-primary" aria-hidden="true"></i>
              Escrow Summary
            </h2>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Total Donated</th>
                    <th>Escrow Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCampaigns.map((campaign) => (
                    <tr key={`summary-${campaign.id}`}>
                      <td>#{campaign.id} {campaign.title}</td>
                      <td>{formatEth(campaign.totalDonated)} ETH</td>
                      <td>{formatEth(campaign.escrowBalance)} ETH</td>
                      <td>
                        <span className={`badge ${statusBadgeClass(campaign.status)}`}>
                          {statusLabel(campaign.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
