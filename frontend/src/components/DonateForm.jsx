import { useState } from "react";

function DonateForm({ campaignId, onDonate, disabled }) {
  const [amountEth, setAmountEth] = useState("0.01");

  async function handleSubmit(event) {
    event.preventDefault();
    await onDonate(campaignId, amountEth);
    setAmountEth("0.01");
  }

  return (
    <form className="mt-3" onSubmit={handleSubmit}>
      <label className="form-label" htmlFor={`donation-${campaignId}`}>
        <i className="bi bi-heart-fill text-success me-1" aria-hidden="true"></i>
        Donate ETH
      </label>
      <div className="input-group">
        <span className="input-group-text">
          <i className="bi bi-cash-coin" aria-hidden="true"></i>
        </span>
        <input
          id={`donation-${campaignId}`}
          className="form-control"
          type="number"
          min="0"
          step="0.0001"
          value={amountEth}
          onChange={(event) => setAmountEth(event.target.value)}
          disabled={disabled}
          required
        />
        <span className="input-group-text">ETH</span>
        <button className="btn btn-success" type="submit" disabled={disabled}>
          <i className="bi bi-send-fill me-1" aria-hidden="true"></i>
          Donate
        </button>
      </div>
    </form>
  );
}

export default DonateForm;
