const express = require("express")
const ffmpeg = require("fluent-ffmpeg")
const cors = require("cors")
const fs = require("fs").promises
const path = require("path")

const app = express()

const AUDIO_DIR = path.join(__dirname, "french_in_action_audio")
const VIDEO_DIR = path.join(__dirname, "processed")
const MAX_FFMPEG_TIME = 60000

app.use(cors())

async function ensureDirs() {
  await fs.mkdir(AUDIO_DIR, { recursive: true })
  await fs.mkdir(VIDEO_DIR, { recursive: true })
}

ensureDirs()

app.get("/", (req, res) => {
  res.json({
    message: "Local media processing server",
    endpoints: ["/screenshot", "/audio"]
  })
})

app.get("/screenshot", async (req, res) => {
  const id = req.query.id
  const timestamp = req.query.timestamp

  if (!id) return res.status(400).json({ error: "Missing id" })
  if (timestamp == null) return res.status(400).json({ error: "Missing timestamp" })

  const time = parseFloat(timestamp)
  if (isNaN(time)) return res.status(400).json({ error: "Invalid timestamp" })

  const seekTime = time / 2
  const videoPath = path.join(VIDEO_DIR, `${id}.mp4`)

  try {
    await fs.access(videoPath)
  } catch {
    return res.status(404).json({ error: "Video not found" })
  }

  res.contentType("image/png")

  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(500).json({ error: "Processing timeout" })
    }
  }, MAX_FFMPEG_TIME)

  ffmpeg(videoPath)
    .seekInput(seekTime)
    .frames(1)
    .format("image2")
    .on("error", err => {
      clearTimeout(timeout)
      if (!res.headersSent) {
        res.status(500).json({ error: err.message })
      }
    })
    .on("end", () => clearTimeout(timeout))
    .pipe(res, { end: true })
})

app.get("/audio", async (req, res) => {
  const id = req.query.id
  const timestamp = req.query.timestamp || "00:00:00"
  const duration = req.query.duration ? parseFloat(req.query.duration) : null

  if (!id) return res.status(400).json({ error: "Missing id" })

  const audioPath = path.join(AUDIO_DIR, `${id}.mp3`)

  try {
    await fs.access(audioPath)
  } catch {
    return res.status(404).json({ error: "Audio not found" })
  }

  res.contentType("audio/mpeg")

  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(500).json({ error: "Processing timeout" })
    }
  }, MAX_FFMPEG_TIME)

  let cmd = ffmpeg(audioPath).seekInput(timestamp)
  if (duration) cmd = cmd.duration(duration)

  cmd
    .format("mp3")
    .on("error", err => {
      clearTimeout(timeout)
      if (!res.headersSent) {
        res.status(500).json({ error: err.message })
      }
    })
    .on("end", () => clearTimeout(timeout))
    .pipe(res, { end: true })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`)
})
