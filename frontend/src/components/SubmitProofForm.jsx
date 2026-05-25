import { useState } from "react";

function SubmitProofForm({ campaignId, onSubmitProof, disabled }) {
  const [proofURI, setProofURI] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmitProof(campaignId, proofURI);
    setProofURI("");
  }

  return (
    <form className="mt-3" onSubmit={handleSubmit}>
      <label className="form-label" htmlFor={`proof-${campaignId}`}>
        <i className="bi bi-file-earmark-check text-warning me-1" aria-hidden="true"></i>
        Submit Proof URI
      </label>
      <div className="input-group">
        <span className="input-group-text">
          <i className="bi bi-link-45deg" aria-hidden="true"></i>
        </span>
        <input
          id={`proof-${campaignId}`}
          className="form-control"
          value={proofURI}
          onChange={(event) => setProofURI(event.target.value)}
          placeholder="ipfs://example-proof-hash"
          disabled={disabled}
          required
        />
        <button className="btn btn-warning" type="submit" disabled={disabled}>
          <i className="bi bi-upload me-1" aria-hidden="true"></i>
          Submit
        </button>
      </div>
    </form>
  );
}

export default SubmitProofForm;
