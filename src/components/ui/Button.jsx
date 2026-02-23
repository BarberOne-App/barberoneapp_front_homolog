import './Button.css';

export default function Button({ children, type = 'button', onClick, disabled, className, style, size }) {
  return (
    <button
      className={`btn${className ? ` ${className}` : ''}${size === 'small' ? ' btn--small' : ''}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}