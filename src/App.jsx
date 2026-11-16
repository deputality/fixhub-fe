import { useEffect, useState } from 'react'

export default function App() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/catalog')
      .then(r => r.json())
      .then(setData)
  }, [])

  return <pre>{JSON.stringify(data, null, 2)}</pre>
}