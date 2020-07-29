const model1 = "heffen.BOWbound10all.PPMIno.LENGTHFOC.SOCPOSnav";
const model2 = "herhalen.LEMMAREL2.PPMIselection.LENGTHFOC.SOCPOSnav";
d3.select("h4#model1").text("Model: " + model1);
d3.select("h4#model2").text("Model: " + model2);

Promise.all([
    d3.csv("data/" + model1 + ".ttmx.dist.csv"),
    d3.tsv("data/heffen.variables.tsv"),
    d3.csv("data/" + model2 + ".ttmx.dist.csv"),
    d3.tsv("data/herhalen.variables.tsv")
]).then(function (data) {
    const width = 400, height = 400, padding = 15;
    let paused = false;

    const model1Data = {
        tokenIds : data[0].columns.map((d) => _.replace(d, /\./g, "/")),
        dists : data[0].map(d => { return (d3.values(d)); }),
        canvas : d3.select("#tsne1").append("canvas").attr("width", width).attr("height", height),
        paused : false
    }
    model1Data.senses = extractSenses(model1Data.tokenIds, data[1]);

    const model2Data = {
        tokenIds : data[2].columns.map((d) => _.replace(d, /\./g, "/")),
        dists : data[2].map(d => { return (d3.values(d)); }),
        canvas : d3.select("#tsne2").append("canvas").attr("width", width).attr("height", height),
        paused : false
    }
    model2Data.senses = extractSenses(model2Data.tokenIds, data[3]);
        
    
    // Scaling functions

    const timescale = d3.scaleLinear()
        .domain([0, 20, 50, 100, 200, 6000])
        .range([60, 30, 20, 10, 0]);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Set up buttons
    d3.select("#runTsne0").on("click", ()=> {
        const perplexity = parseInt(d3.select("#setPerplexity0").property("value"));
        d3.select("#setPerplexity1").property("value", perplexity);
        d3.select("#setPerplexity2").property("value", perplexity);
        model1Data.paused = model2Data.paused = paused = false;
        d3.select("#pauseTsne0").text("Pause");
        runTSNE(model1Data, perplexity, "1");
        runTSNE(model2Data, perplexity, "2");
    });
    d3.select("#runTsne1").on("click", ()=> {
        const perplexity = parseInt(d3.select("#setPerplexity1").property("value"));
        model1Data.paused = false;
        d3.select("#pauseTsne1").text("Pause");
        
        runTSNE(model1Data, perplexity, "1");
    });
    d3.select("#runTsne2").on("click", ()=> {
        const perplexity = parseInt(d3.select("#setPerplexity2").property("value"));
        model2Data.paused = false;
        d3.select("#pauseTsne2").text("Pause");
        
        runTSNE(model2Data, perplexity, "2");
    });

    d3.select("#pauseTsne0").on("click", ()=>{
        paused = !paused;
        const newText = paused ? "Restart" : "Pause";
        console.log(paused)
        d3.select("#pauseTsne0").text(newText);
        d3.select("#pauseTsne1").on("click")();
        d3.select("#pauseTsne2").on("click")();
    });

    // Functions
    function runTSNE(modelData, perplexity, modelNumber){
        let chunk = 1;
        let step = 0;
        
        // Run t-SNE
        const opt = {
            "epsilon": 10,
            "perplexity": perplexity,
            "dim": 2
        }

        const tsne = new tsnejs.tSNE(opt); // create a tSNE instance

        tsne.initDataDist(modelData.dists);
       
        function iterate() {
            if (step >= 2000 || modelData.paused) return;
            
            if (step >=100 ) chunk = 10;
            for (let k = 0; k < chunk; k++) {
                tsne.step(); // every time you call this, solution gets better
                ++step;
            }
            
            const solution = tsne.getSolution();
            drawPlot(solution, modelData.canvas, modelData.senses);
            d3.select("#currentStep"+modelNumber).text(step);
    
            setTimeout(iterate, timescale(step));

            d3.select("#exportTsne"+modelNumber).on("click", ()=> {
                console.log(opt);
                console.log(solution);
            })
        }

        iterate();
        
        d3.select("#pauseTsne"+modelNumber).on("click", ()=>{
            modelData.paused = !modelData.paused;
            const newText = modelData.paused ? "Restart" : "Pause";
            d3.select("#pauseTsne"+modelNumber).text(newText);
            
            iterate();
        });

    }

    function drawPlot(solution, canvas, senses) {
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

    function extractSenses(tokenIds, variables){
        const senses = tokenIds.map((t) => {
            const thisRow = variables.filter((v) => {
                return (v["_id"] === t);
            })[0]
            return(thisRow !== undefined ? thisRow["collapsed_sense"] : "none");
        });
        return(senses);
    }
    
});