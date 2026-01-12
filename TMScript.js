      // More API functions here:
      // https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/pose

(async () => {
    // the link to your model provided by Teachable Machine export panel
    const URL = "https://teachablemachine.withgoogle.com/models/fViCArmZg/";

    const sounds = {
        // "arm": new Audio("my_sounds/mars.mp3"),
        // "armen": new Audio("my_sounds/snickers.mp3"),
        // "recht": new Audio("my_sounds/milkyway.mp3"),

        "Default": new Audio("my_sounds/luvvoice.com-Default.mp3", "my_sounds/luvvoice.com-Beginpunt.mp3", 1),
        "Zoom": new Audio("my_sounds/luvvoice.com-Zoom.mp3", "my_sounds/luvvoice.com-Vergroten.mp3", 1),
        "Speaking": new Audio("my_sounds/152929b5-6071-Speaking.mp3", "my_sounds/luvvoice.com-Voorlezen.mp3", 1)


        // https://luvvoice.com/ alle stemmen komen hier van daan.
    };
    let model, webcam, ctx, labelContainer, maxPredictions;
    const confidenceThreshold = 0.75;
    const holdTime = 2000;
    const cooldown = 3000;
    const bufferSize = 5;
    const displayHoldDuration = 5000;
    const size = 400;

    const holdStart = {};
    const lastPlayed = {};
    const predictionBuffer = {};
    let currentDetectedClass = null;

    const imageDiv = document.getElementById("image-display");
    const predictionDiv = document.getElementById("prediction");

    // --- Initialize webcam ---
    try {
        // Convenience function to setup a webcam
        const size2 = 400;
        const flip = true; // whether to flip the webcam
        webcam = new tmPose.Webcam(size, size2, flip, { facingMode: "user" }); // width, height, flip
        await webcam.setup();
        await webcam.play();
        window.requestAnimationFrame(loop);
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        console.log("Webcam ready!");
    } catch (err) {
        console.error("Webcam initialization failed:", err);
        predictionDiv.innerText = "Webcam initialization failed!";
        return;
    }

    // --- Load model ---
    try {
        // load the model and metadata
        // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
        // Note: the pose library adds a tmPose object to your window (window.tmPose)
        model = await tmPose.load(URL + "model.json", URL + "metadata.json");
        console.log("Model loaded!");
        predictionDiv.innerText = "Model loaded!";
    } catch (err) {
        console.error("Model loading failed:", err);
        predictionDiv.innerText = "Model loading failed!";
        return;
    }

        // --- Main loop ---
    async function loop() {
        webcam.update(); // update the webcam frame
        if (model) await predict();
        window.requestAnimationFrame(loop);
        requestAnimationFrame(loop);
    }

    async function predict() {
        try {
            // append/get elements to the DOM
            const canvas = document.getElementById("canvas");
            canvas.width = size;
            canvas.height = size;
            ctx = canvas.getContext("2d");
            labelContainer = document.getElementById("label-container");
            for (let i = 0; i < maxPredictions; i++) {
            // and class labels
            labelContainer.appendChild(document.createElement("div"));
            }

            // Prediction #1: run input through posenet
            // estimatePose can take in an image, video or canvas html element
            const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
            if (!pose || !posenetOutput) return;

            // Prediction 2: run input through teachable machine classification model
            const predictions = await model.predict(posenetOutput);

            for (let i = 0; i < maxPredictions; i++) {
                const classPrediction =
                prediction[i].className +
                ": " +
                prediction[i].probability.toFixed(2);
                labelContainer.childNodes[i].innerHTML = classPrediction;
            }

            // finally draw the poses
            drawPose(pose);

            console.log("Predictions:", predictions);

            if (predictions.length === 0) {
                predictionDiv.innerText = "No predictions";
                return;
            }

            const highest = predictions.reduce((a, b) => a.probability > b.probability ? a : b);
            const className = highest.className.trim();
            const prob = highest.probability;

            // Rolling buffer
            if (!predictionBuffer[className]) predictionBuffer[className] = [];
            predictionBuffer[className].push(prob);
            if (predictionBuffer[className].length > bufferSize) predictionBuffer[className].shift();
            const avgProb = predictionBuffer[className].reduce((a, b) => a + b, 0) / predictionBuffer[className].length;

            const now = Date.now();

            // --- Detection logic ---
            if (avgProb >= confidenceThreshold) {
                if (!holdStart[className]) holdStart[className] = now;

                if (now - holdStart[className] >= holdTime) {
                    if (!lastPlayed[className] || now - lastPlayed[className] > cooldown) {
                        lastPlayed[className] = now;

                        if (sounds[className]) sounds[className].play();
                        imageDiv.innerHTML = `<img src="${images[className]}" alt="${className}">`;
                        currentDetectedClass = className;

                        setTimeout(() => {
                            if (images["Completed"]) {
                                imageDiv.innerHTML = `<img src="${images["Completed"]}" alt="Completed">`;
                            }
                        }, 500);

                        setTimeout(() => {
                            imageDiv.innerHTML = `<img src="${images["Neutral"]}" alt="Neutral">`;
                            currentDetectedClass = null;
                        }, displayHoldDuration);
                    }
                    holdStart[className] = null;
                }
            } else {
                holdStart[className] = null;
                if (!currentDetectedClass) {
                    imageDiv.innerHTML = `<img src="${images["Neutral"]}" alt="Neutral">`;
                }
            }

            // Update prediction text
            predictionDiv.innerText =
                avgProb >= confidenceThreshold
                    ? `Detected: ${className} (${(avgProb * 100).toFixed(2)}%)`
                    : "No detection";

        } catch (err) {
            console.error("Prediction failed:", err);
            predictionDiv.innerText = "Prediction error! See console.";
        }
    }

    function drawPose(pose) {
    if (webcam.canvas) {
        ctx.drawImage(webcam.canvas, 0, 0);
          // draw the keypoints and skeleton
          if (pose) {
            const minPartConfidence = 0.5;
            tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
            tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
          }
        }
    }

    loop();
})();