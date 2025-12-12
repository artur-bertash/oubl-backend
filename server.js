const express = require("express");
const ffmpeg = require("fluent-ffmpeg");
const cors = require("cors");
const app = express();

app.use(cors());

app.get("/", (req, res) => {
    res.json({ message: "Hello world!" });
});

app.get("/screenshot", (req, res) => {
    const { url, timestamp } = req.query;

    if (!url) {
        return res.status(400).json({ error: "Missing url" });
    }


    const seekTime = timestamp || "00:00:00";

    res.contentType("image/png");

    ffmpeg(url)
        .seekInput(seekTime)
        .frames(1)
        .format("image2")
        .on("error", (err) => {
            console.error("FFmpeg error:", err);

            if (!res.headersSent) {
                res.status(500).json({ error: "Failed to capture screenshot", details: err.message });
            }
        })
        .pipe(res, { end: true });
});

app.get("/audio", (req, res) => {
    const { url, timestamp, duration } = req.query;

    if (!url) {
        return res.status(400).json({ error: "Missing video ID (url) parameter" });
    }


    const seekTime = timestamp || "00:00:00";
    const audioDuration = duration ? parseFloat(duration) : null;

    res.contentType("audio/mpeg");

    let command = ffmpeg(url)
        .seekInput(seekTime);

    if (audioDuration) {
        command = command.duration(audioDuration);
    }

    command
        .format("mp3")
        .on("error", (err) => {
            console.error("FFmpeg error:", err);
            if (!res.headersSent) {
                res.status(500).json({ error: "Failed to extract audio", details: err.message });
            }
        })
        .pipe(res, { end: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});