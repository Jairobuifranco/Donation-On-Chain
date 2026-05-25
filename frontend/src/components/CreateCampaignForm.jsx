import { useEffect, useMemo, useState } from "react";
import { parseEth } from "../utils/contract";

function getDefaultDeadline() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setSeconds(0, 0);
  return tomorrow.toISOString().slice(0, 16);
}

function CreateCampaignForm({ account, onCreateCampaign, disabled }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fundingGoalEth, setFundingGoalEth] = useState("1");
  const [deadlineLocal, setDeadlineLocal] = useState(getDefaultDeadline());
  const [charity, setCharity] = useState(account || "");

  const currentCharity = useMemo(() => charity || account || "", [account, charity]);

  useEffect(() => {
    setCharity(account || "");
  }, [account]);

  async function handleSubmit(event) {
    event.preventDefault();

    const deadlineTimestamp = Math.floor(new Date(deadlineLocal).getTime() / 1000);
    const fundingGoalWei = parseEth(fundingGoalEth).toString();

    await onCreateCampaign({
      title,
      description,
      fundingGoalWei,
      deadlineTimestamp,
      charity: currentCharity
    });

    setTitle("");
    setDescription("");
    setFundingGoalEth("1");
    setDeadlineLocal(getDefaultDeadline());
  }

  return (
    <section className="bg-white border rounded-2 p-3 mb-4">
      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h2 className="h5 mb-1">Create Campaign</h2>
          <p className="form-hint mb-0">Use the connected charity wallet as the campaign charity.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label" htmlFor="campaign-title">
              Title
            </label>
            <input
              id="campaign-title"
              className="form-control"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Food for Children"
              required
              disabled={disabled}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label" htmlFor="funding-goal">
              Funding Goal in ETH
            </label>
            <input
              id="funding-goal"
              className="form-control"
              type="number"
              min="0"
              step="0.0001"
              value={fundingGoalEth}
              onChange={(event) => setFundingGoalEth(event.target.value)}
              required
              disabled={disabled}
            />
          </div>

          <div className="col-12">
            <label className="form-label" htmlFor="campaign-description">
              Description
            </label>
            <textarea
              id="campaign-description"
              className="form-control"
              rows="2"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Food for infants under 16 years old"
              required
              disabled={disabled}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label" htmlFor="campaign-deadline">
              Deadline
            </label>
            <input
              id="campaign-deadline"
              className="form-control"
              type="datetime-local"
              value={deadlineLocal}
              onChange={(event) => setDeadlineLocal(event.target.value)}
              required
              disabled={disabled}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label" htmlFor="charity-address">
              Charity Wallet
            </label>
            <input
              id="charity-address"
              className="form-control mono"
              value={currentCharity}
              onChange={(event) => setCharity(event.target.value)}
              placeholder="0x..."
              required
              disabled={disabled}
            />
            <div className="form-hint mt-1">This should match the connected charity account.</div>
          </div>
        </div>

        <button className="btn btn-success mt-3" type="submit" disabled={disabled || !account}>
          Create Campaign
        </button>
      </form>
    </section>
  );
}

export default CreateCampaignForm;
