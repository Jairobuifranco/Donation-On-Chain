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
        Donate ETH
      </label>
      <div className="input-group">
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
        <button className="btn btn-primary" type="submit" disabled={disabled}>
          Donate
        </button>
      </div>
    </form>
  );
}

export default DonateForm;
