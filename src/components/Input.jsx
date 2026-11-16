export default function Input({ label, error, ...props }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className={`field-input ${error ? 'has-error' : ''}`} {...props} />
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}