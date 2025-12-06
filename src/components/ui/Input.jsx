import './Input.css';

export default function Input({ label, type = 'text', name, placeholder, value, onChange }) {
  return (
    <label className="input-field">
      {label && <span className="input-field__label">{label}</span>}
      <input
        className="input-field__control"
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </label>
  );
}
