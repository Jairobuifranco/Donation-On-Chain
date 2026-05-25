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
        Submit Proof URI
      </label>
      <div className="input-group">
        <input
          id={`proof-${campaignId}`}
          className="form-control"
          value={proofURI}
          onChange={(event) => setProofURI(event.target.value)}
          placeholder="ipfs://example-proof-hash"
          disabled={disabled}
          required
        />
        <button className="btn btn-outline-secondary" type="submit" disabled={disabled}>
          Submit
        </button>
      </div>
    </form>
  );
}

export default SubmitProofForm;
