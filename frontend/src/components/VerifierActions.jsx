import { useState } from "react";

function VerifierActions({ campaignId, onApproveProof, onRejectProof, disabled, canApprove, approvalBlockedReason }) {
  const [reason, setReason] = useState("");

  async function handleReject(event) {
    event.preventDefault();
    await onRejectProof(campaignId, reason);
    setReason("");
  }

  return (
    <div className="mt-3 border-top pt-3">
      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <span className="fw-semibold">Verifier Actions</span>
        <button
          className="btn btn-success btn-sm"
          type="button"
          onClick={() => onApproveProof(campaignId)}
          disabled={disabled || !canApprove}
        >
          Approve Proof
        </button>
      </div>

      {!canApprove && approvalBlockedReason && (
        <div className="alert alert-warning py-2 mb-3">
          {approvalBlockedReason}
        </div>
      )}

      <form onSubmit={handleReject}>
        <label className="form-label" htmlFor={`reject-${campaignId}`}>
          Rejection Reason
        </label>
        <div className="input-group">
          <input
            id={`reject-${campaignId}`}
            className="form-control"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Receipt is unclear"
            disabled={disabled}
            required
          />
          <button className="btn btn-outline-danger" type="submit" disabled={disabled}>
            Reject Proof
          </button>
        </div>
      </form>
    </div>
  );
}

export default VerifierActions;
