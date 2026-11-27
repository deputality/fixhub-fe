import { CircleAlert } from 'lucide-react'

export default function Input({ label, icon, right, error, ...props }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={props.id}>{label}</label>
      <div className={`field-box${error ? ' has-error' : ''}`}>
        {icon}
        <input
          className="field-input"
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {right}
      </div>
      {error && (
        <span className="field-error" role="alert">
          <CircleAlert size={15} />
          {error}
        </span>
      )}
    </div>
  )
}