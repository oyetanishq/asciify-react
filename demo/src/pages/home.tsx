import { AsciiImage } from "asciify-react";

function App() {
    return (
        <div className="bg-[#0e0e0e] flex-1 w-full flex justify-center items-center overflow-hidden">
            <AsciiImage className="scale-50 md:scale-75 lg:scale-100" background="#0e0e0e" src="/test.jpg" numCols={120} charset="binary" color noiseScale={0.3} noiseSpeed={1.0} fontSize={9} />
        </div>
    );
}

export default App;
