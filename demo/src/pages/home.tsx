import { AsciiImage } from "asciify-react";

function App() {
    return (
        <div style={{ background: "#0e0e0e", width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AsciiImage fit="contain" width="90%" height="60%" background="#0e0e0e" src="/test.jpg" charset="binary" color noiseScale={0.3} noiseSpeed={1.0} fontSize={9} />
        </div>
    );
}

export default App;
