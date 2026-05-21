import { AsciiImage } from "asciify-react";

function App() {
    return (
        <div style={{ background: "#0e0e0e", width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <AsciiImage
                responsive
                background="#0e0e0e"
                src="/test.jpg"
                numCols={120}
                charset="binary"
                color
                noiseScale={0.3}
                noiseSpeed={1.0}
                fontSize={9}
                style={{ width: "100%", height: "100%" }}
            />
        </div>
    );
}

export default App;
