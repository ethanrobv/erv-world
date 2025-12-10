import { useEffect, useState } from 'react'
import './App.css'

interface TestResponse {
    message: string;
    timestamp: string;
}

function App() {
    const [data, setData] = useState<TestResponse>({ message: 'Loading...', timestamp: ''});

    useEffect(() => {
        fetch('/api/test')
            .then((res) => res.json())
            .then((data: TestResponse) => {
                setData(data);
            })
            .catch((err) => console.log(err));
    }, [])

    return (
        <div>
            <h1>{ data.message }, { data.timestamp }</h1>
        </div>
    )
}

export default App
