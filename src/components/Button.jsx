export default function Button({ variant = 'primary', block = false, children, ...props }) {
  return (
    <button className={`btn btn-${variant}${block ? ' btn-block' : ''}`} {...props}>
      {children}
    </button>
  )
}