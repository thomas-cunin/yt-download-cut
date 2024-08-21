const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const ytdl = require("@distube/ytdl-core");
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// YouTube video URL
const YOUTUBE_URL = 'https://www.youtube.com/watch?v=JsDmQwXPxPk';

app.get('/convert-video', async (req, res) => {
    const videoPath = path.join(__dirname, 'videos', 'downloaded.mp4');
    const outputPath = path.join(__dirname, 'videos', 'output.mp4');

    try {
        // Check if the videos directory exists, if not create it
        if (!fs.existsSync(path.join(__dirname, 'videos'))) {
            fs.mkdirSync(path.join(__dirname, 'videos'));
        }

        // Stream the video from YouTube and save it to the videos directory
        const videoStream = ytdl(YOUTUBE_URL, { quality: 'highest' });
        const writeStream = fs.createWriteStream(videoPath);

        videoStream.pipe(writeStream);

        // When the download finishes, process the video with FFmpeg
        writeStream.on('finish', () => {
            console.log('Video downloaded successfully');

            // Start processing with FFmpeg
            ffmpeg(videoPath)
                .output(outputPath)
                .on('progress', (progress) => {
                    // Log the progress in real-time
                    console.log(`Processing: ${progress.percent.toFixed(2)}% done`);
                })
                .on('end', () => {
                    console.log('Processing finished successfully');
                    res.send('Video conversion completed!');
                })
                .on('error', (err) => {
                    console.error('Error during processing:', err);
                    res.status(500).send('Video conversion failed.');
                })
                .run();
        });

        writeStream.on('error', (err) => {
            console.error('Error writing the video:', err);
            res.status(500).send('Failed to download video.');
        });

        videoStream.on('error', (err) => {
            console.error('Error downloading the video:', err);
            res.status(500).send('Failed to download video.');
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).send('An unexpected error occurred.');
    }
});

// New /test-download-part route
app.get('/test-download-part', async (req, res) => {
    const videoPath = path.join(__dirname, 'videos', 'segment.mp4');

    try {
        // Get video info
        const info = await ytdl.getInfo(YOUTUBE_URL);

        // Choose a format (e.g., highest quality video+audio)
        const format = ytdl.chooseFormat(info.formats, { quality: 'highest' });

        // Desired time range in seconds
        const startSeconds = 30; // 00:30
        const endSeconds = 65;   // 01:05

        // Bitrate in bits per second (bps)
        const bitrate = format.bitrate || (format.audioBitrate * 1000);

        // Calculate byte range (this is an estimate for CBR videos)
        const startByte = Math.floor((bitrate * startSeconds) / 8);
        const endByte = Math.floor((bitrate * endSeconds) / 8);

        console.log(`Estimated byte range: ${startByte} - ${endByte}`);

        // Stream the specific byte range from YouTube
        const videoStream = ytdl(YOUTUBE_URL, {
            format: format,
            range: { start: startByte, end: endByte },
        });

        const writeStream = fs.createWriteStream(videoPath);

        videoStream.pipe(writeStream);

        writeStream.on('finish', () => {
            console.log('Downloaded part of the video successfully!');
            res.send('Downloaded and saved the video segment!');
        });

        writeStream.on('error', (err) => {
            console.error('Error writing the video:', err);
            res.status(500).send('Failed to write video segment.');
        });

        videoStream.on('error', (err) => {
            console.error('Error downloading the video:', err);
            res.status(500).send('Failed to download video segment.');
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        res.status(500).send('An unexpected error occurred.');
    }
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
