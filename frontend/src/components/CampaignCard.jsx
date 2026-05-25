import {
  canCharitySubmitProof,
  formatEth,
  isCampaignOpenForDonations,
  isCampaignOwner,
  formatAddress,
  proofSubmissionMessage,
  statusBadgeClass,
  statusLabel
} from "../utils/contract";
import DonateForm from "./DonateForm";
import SubmitProofForm from "./SubmitProofForm";
import VerifierActions from "./VerifierActions";

function renderProof(proofURI) {
  if (!proofURI) {
    return (
      <span className="text-secondary">
        <i className="bi bi-file-earmark me-1" aria-hidden="true"></i>
        No proof submitted yet
      </span>
    );
  }

  if (proofURI.startsWith("http://") || proofURI.startsWith("https://")) {
    return (
      <a className="proof-link" href={proofURI} target="_blank" rel="noreferrer">
        <i className="bi bi-box-arrow-up-right me-1" aria-hidden="true"></i>
        {proofURI}
      </a>
    );
  }

  return (
    <span className="proof-link mono">
      <i className="bi bi-link-45deg me-1" aria-hidden="true"></i>
      {proofURI}
    </span>
  );
}

function getFundingProgress(campaign) {
  const fundingGoal = BigInt(campaign.fundingGoal ?? 0n);
  const totalDonated = BigInt(campaign.totalDonated ?? 0n);

  if (fundingGoal === 0n) {
    return 0;
  }

  const rawPercent = Number((totalDonated * 10000n) / fundingGoal) / 100;
  return Math.min(rawPercent, 100);
}

function getDeadlineState(deadline) {
  const now = Math.floor(Date.now() / 1000);
  const secondsRemaining = Number(deadline) - now;

  if (secondsRemaining <= 0) {
    return {
      label: "Expired",
      badgeClass: "text-bg-secondary"
    };
  }

  const daysRemaining = Math.ceil(secondsRemaining / 86400);

  return {
    label: daysRemaining === 1 ? "Ends in 1 day" : `Ends in ${daysRemaining} days`,
    badgeClass: daysRemaining <= 2 ? "text-bg-warning" : "text-bg-light border"
  };
}

function CampaignCard({
  campaign,
  account,
  isVerifier,
  isBusy,
  variant = "donor",
  onDonate,
  onSubmitProof,
  onApproveProof,
  onRejectProof
}) {
  const isCharity = isCampaignOwner(campaign, account);
  const canDonate = variant === "donor" && isCampaignOpenForDonations(campaign);
  const canShowProofForm = variant === "charity" && isCharity && [0, 1, 2].includes(Number(campaign.status));
  const canSubmitProof = canShowProofForm && canCharitySubmitProof(campaign);
  const canVerify = variant === "admin" && isVerifier && Number(campaign.status) === 1;
  const hasEscrowFunds = BigInt(campaign.escrowBalance ?? 0n) > 0n;
  const showProofDetails = variant !== "donor";
  const showAdminDetails = variant === "admin";
  const deadlineDate = new Date(campaign.deadline * 1000).toLocaleString();
  const fundingProgress = getFundingProgress(campaign);
  const deadlineState = getDeadlineState(campaign.deadline);
  const isReleased = Number(campaign.status) === 4;

  return (
    <article className="card campaign-card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between gap-3 align-items-start mb-2">
          <div>
            <h3 className="h5 mb-1">
              <i className="bi bi-megaphone text-primary me-2" aria-hidden="true"></i>
              {campaign.title}
            </h3>
            <div className="text-secondary small">Campaign #{campaign.id}</div>
          </div>
          <span className={`badge ${statusBadgeClass(campaign.status)}`}>
            <i className="bi bi-circle-fill me-1 status-dot" aria-hidden="true"></i>
            {statusLabel(campaign.status)}
          </span>
        </div>

        <p className="campaign-description mb-3">{campaign.description}</p>

        <div className="mb-3">
          <div className="d-flex justify-content-between gap-2 mb-1">
            <span className="small text-secondary">
              <i className="bi bi-graph-up-arrow me-1" aria-hidden="true"></i>
              Funding progress
            </span>
            <span className="small fw-semibold">{fundingProgress.toFixed(1)}%</span>
          </div>
          <div className="progress funding-progress" role="progressbar" aria-label="Funding progress" aria-valuenow={fundingProgress} aria-valuemin="0" aria-valuemax="100">
            <div className="progress-bar bg-success" style={{ width: `${fundingProgress}%` }} />
          </div>
        </div>

        <dl className="row mb-0">
          <dt className="col-5"><i className="bi bi-building-fill me-1 text-primary" aria-hidden="true"></i>Charity</dt>
          <dd className="col-7 mono">{formatAddress(campaign.charity)}</dd>

          <dt className="col-5"><i className="bi bi-bullseye me-1 text-success" aria-hidden="true"></i>Funding Goal</dt>
          <dd className="col-7">{formatEth(campaign.fundingGoal)} ETH</dd>

          <dt className="col-5"><i className="bi bi-cash-coin me-1 text-success" aria-hidden="true"></i>Total Donated</dt>
          <dd className="col-7">{formatEth(campaign.totalDonated)} ETH</dd>

          <dt className="col-5"><i className="bi bi-safe2 me-1 text-primary" aria-hidden="true"></i>Escrow Balance</dt>
          <dd className="col-7 fw-semibold">{formatEth(campaign.escrowBalance)} ETH</dd>

          <dt className="col-5"><i className="bi bi-calendar-event me-1 text-warning" aria-hidden="true"></i>Deadline</dt>
          <dd className="col-7">
            <div>{deadlineDate}</div>
            <span className={`badge ${deadlineState.badgeClass}`}>{deadlineState.label}</span>
          </dd>

          {showProofDetails && (
            <>
              <dt className="col-5"><i className="bi bi-file-earmark-check me-1 text-warning" aria-hidden="true"></i>Proof Count</dt>
              <dd className="col-7">{campaign.proofSubmissionCount}</dd>
            </>
          )}
        </dl>

        {showProofDetails && (
          <div className="proof-box mt-3">
            <div className="fw-semibold mb-1">{showAdminDetails ? "Proof URI / Hash" : "Latest Proof"}</div>
            {renderProof(campaign.latestProofURI)}
          </div>
        )}

        {showProofDetails && campaign.latestRejectionReason && (
          <div className="alert alert-danger py-2 mt-3 mb-0">
            <strong>Latest rejection:</strong> {campaign.latestRejectionReason}
          </div>
        )}

        {canDonate && <DonateForm campaignId={campaign.id} onDonate={onDonate} disabled={isBusy} />}

        {variant === "donor" && !canDonate && (
          <div className="alert alert-secondary py-2 mt-3 mb-0">
            {isReleased ? "Funds have already been released for this campaign." : "Donations are not available for this campaign."}
          </div>
        )}

        {canShowProofForm && (
          <>
            <div className={`alert ${canSubmitProof ? "alert-success" : "alert-warning"} py-2 mt-3 mb-0`}>
              {proofSubmissionMessage(campaign)}
            </div>
            <SubmitProofForm
              campaignId={campaign.id}
              onSubmitProof={onSubmitProof}
              disabled={isBusy || !canSubmitProof}
            />
          </>
        )}

        {variant === "charity" && !isCharity && (
          <div className="alert alert-light border py-2 mt-3 mb-0">
            Only the campaign charity wallet can submit proof.
          </div>
        )}

        {canVerify && (
          <VerifierActions
            campaignId={campaign.id}
            onApproveProof={onApproveProof}
            onRejectProof={onRejectProof}
            disabled={isBusy}
            canApprove={hasEscrowFunds}
            approvalBlockedReason="No escrowed funds to release yet. A campaign must receive a donation before approval can release ETH."
          />
        )}
      </div>
    </article>
  );
}

export default CampaignCard;
