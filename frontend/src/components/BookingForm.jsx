import { useState } from "react";
import "../assets/styles/forms.css";

const BookingForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    startDateTime: "",
    endDateTime: "",
    notes: "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

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
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onSubmit(formData);
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>Start Date &amp; Time</label>
      <input
        type="datetime-local"
        name="startDateTime"
        value={formData.startDateTime}
        onChange={handleChange}
      />
      {errors.startDateTime && <p className="error">{errors.startDateTime}</p>}

      <label>End Date &amp; Time</label>
      <input
        type="datetime-local"
        name="endDateTime"
        value={formData.endDateTime}
        onChange={handleChange}
      />
      {errors.endDateTime && <p className="error">{errors.endDateTime}</p>}

      <textarea
        name="notes"
        placeholder="Notes (optional)"
        value={formData.notes}
        onChange={handleChange}
      />

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Submitting..." : "Book Venue"}
      </button>
    </form>
  );
};

export default BookingForm;
