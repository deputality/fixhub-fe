export default function Button({
  variant = 'primary',
  block = false,
  loading = false,
  disabled,
  children,
  ...props
}) {
  return (
    <button
      className={`btn btn-${variant}${block ? ' btn-block' : ''}${loading ? ' is-loading' : ''}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}