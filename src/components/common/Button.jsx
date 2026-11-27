export default function Button({
  variant = 'primary',
  block = false,
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}) {
  // className дописываем к базовым классам, иначе он затирает стили кнопки
  const classes = `btn btn-${variant}${block ? ' btn-block' : ''}${loading ? ' is-loading' : ''}${className ? ` ${className}` : ''}`

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}
