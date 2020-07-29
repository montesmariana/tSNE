// const model = "heffen.BOWbound10all.PPMIno.LENGTHFOC.SOCPOSnav";
const model = "herhalen.LEMMAREL2.PPMIselection.LENGTHFOC.SOCPOSnav";
d3.select("h3").text("Model: " + model);

Promise.all([
    d3.csv("data/" + model+ ".ttmx.dist.csv"),
    d3.tsv("data/herhalen.variables.tsv")
]).then(function (data) {
    const width = 600, height = 600, padding = 30;
    const tokenIds = data[0].columns.map((d) => _.replace(d, /\./g, "/"));
    const dists = data[0].map(d => { return (d3.values(d)); });
    const variables = data[1];
    let paused = false;
        
    const canvas = d3.select("#tsne").append("canvas")
        .attr("width", width).attr("height", height);

    // Scaling functions

    const timescale = d3.scaleLinear()
        .domain([0, 20, 50, 100, 200, 6000])
        .range([60, 30, 20, 10, 0]);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Set up buttons
    d3.select("#runTsne").on("click", ()=> {
        const perplexity = parseInt(d3.select("#setPerplexity").property("value"));
        paused = false;
        d3.select("#pauseTsne").text("Pause");
        
        runTSNE(perplexity);
    });

    // Load senses   
    const senses = tokenIds.map((t) => {
        const thisRow = variables.filter((v) => {
            return (v["_id"] === t);
        })[0]
        return(thisRow !== undefined ? thisRow["collapsed_sense"] : "none");
    });
    

    // Functions
    function runTSNE(perplexity){
        let chunk = 1;
        let step = 0;
        
        // Run t-SNE
        const opt = {
            "epsilon": 10,
            "perplexity":perplexity,
            "dim": 2
        }

        console.log(opt.perplexity)

        const tsne = new tsnejs.tSNE(opt); // create a tSNE instance

        tsne.initDataDist(dists);

       
        function iterate() {
            if (step >= 5000 || paused) return;
            
            if (step >=200 ) chunk = 10;
            for (let k = 0; k < chunk; k++) {
                tsne.step(); // every time you call this, solution gets better
                ++step;
            }
            
            const solution = tsne.getSolution();
            drawPlot(solution, senses);
            d3.select("#currentStep").text(step);
    
            setTimeout(iterate, timescale(step));

            d3.select("#exportTsne").on("click", ()=> {
                console.log(opt);
                console.log(solution);
            })
        }

        iterate();
        
        d3.select("#pauseTsne").on("click", ()=>{
            paused = !paused;
            const newText = paused ? "Restart" : "Pause";
            d3.select("#pauseTsne").text(newText);
            
            iterate();
        });

    }

    function drawPlot(solution, senses) {
        const context = canvas.node().getContext("2d");
        context.fillStyle = "white";
        context.fillRect(padding/2, padding/2, width - padding, height - padding);
        const x = d3.scaleLinear()
            .domain(d3.extent(solution, (p) => { return (p[0]) }))
            .range([padding, width - padding * 2]);

        const y = d3.scaleLinear()
            .domain(d3.extent(solution, (p) => { return (p[1]) }))
            .range([padding, height - padding * 2]);
        
        for (let i = 0; i < solution.length; i++) {
            context.beginPath();
            context.arc(x(solution[i][0]), y(solution[i][1]), 4, 0, 2 * Math.PI);
            context.fillStyle = color(senses[i]);
            context.fill();
            context.stroke();
        }

    }
    
});