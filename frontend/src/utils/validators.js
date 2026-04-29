const passwordStrength = (pwd) => {
  if (pwd.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(pwd)) return "Password must contain at least one number";
  if (!/[^A-Za-z0-9]/.test(pwd)) return "Password must contain at least one special character";
  return null;
};

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
  if (!data.password) {
    errors.password = "Password is required";
  } else {
    const pwdError = passwordStrength(data.password);
    if (pwdError) errors.password = pwdError;
  }
  return errors;
};
