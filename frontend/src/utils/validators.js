export const validateLoginForm = (data) => {
  const errors = {};

  if (!data.email) errors.email = "Email is required";
  if (!data.password) errors.password = "Password is required";

  return errors;
};

export const validateRegisterForm = (data) => {
  const errors = {};

  if (!data.name) errors.name = "Name is required";
  if (!data.email) errors.email = "Email is required";
  if (!data.password) errors.password = "Password is required";
  if (data.password.length < 6) errors.password = "Password must be at least 6 characters";

  return errors;
};

export const validateBookingForm = (data) => {
  const errors = {};

  if (!data.date) errors.date = "Booking date is required";
  if (!data.startTime) errors.startTime = "Start time is required";
  if (!data.endTime) errors.endTime = "End time is required";
  if (!data.purpose) errors.purpose = "Purpose is required";

  if (data.startTime && data.endTime && data.startTime >= data.endTime) {
    errors.endTime = "End time must be later than start time";
  }

  return errors;
};