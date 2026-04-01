import { useState } from "react";

const BookingForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({ startDateTime: "", endDateTime: "", notes: "" });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!formData.startDateTime) errs.startDateTime = "Start date/time is required";
    if (!formData.endDateTime) errs.endDateTime = "End date/time is required";
    if (formData.startDateTime && formData.endDateTime && formData.startDateTime >= formData.endDateTime) {
      errs.endDateTime = "End must be after start";
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className={`form-group${errors.startDateTime ? " has-error" : ""}`}>
        <label>Start Date & Time</label>
        <input type="datetime-local" name="startDateTime" value={formData.startDateTime} onChange={handleChange} />
        {errors.startDateTime && <p className="error">{errors.startDateTime}</p>}
      </div>
      <div className={`form-group${errors.endDateTime ? " has-error" : ""}`}>
        <label>End Date & Time</label>
        <input type="datetime-local" name="endDateTime" value={formData.endDateTime} onChange={handleChange} />
        {errors.endDateTime && <p className="error">{errors.endDateTime}</p>}
      </div>
      <div className="form-group">
        <label>Notes <span style={{ color: "var(--text-faint)", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
        <textarea name="notes" placeholder="Any special requirements or notes..." value={formData.notes} onChange={handleChange} rows={3} />
      </div>
      <button
        type="submit"
        disabled={loading}
        className={`btn btn-primary btn-lg form-submit${loading ? " btn-loading" : ""}`}
      >
        {loading ? "Submitting…" : "Request Booking →"}
      </button>
    </form>
  );
};

export default BookingForm;
