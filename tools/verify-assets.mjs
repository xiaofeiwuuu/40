import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const assetsRoot = join(projectRoot, 'assets');

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function totalBytes(paths) {
  return paths.reduce((total, path) => total + statSync(path).size, 0);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectFiles(directory, expectedNames, label) {
  assert(existsSync(directory), `${label} directory is missing: ${relative(projectRoot, directory)}`);
  const actualNames = readdirSync(directory)
    .filter((name) => ['.jpg', '.jpeg'].includes(extname(name).toLowerCase()))
    .sort();
  const expected = [...expectedNames].sort();
  assert(
    JSON.stringify(actualNames) === JSON.stringify(expected),
    `${label} mismatch: expected ${expected.length}, found ${actualNames.length}`
  );
}

function identifyImage(path, maximumEdge) {
  const output = execFileSync(
    '/opt/homebrew/bin/magick',
    ['identify', '-format', '%w %h', path],
    { encoding: 'utf8' }
  ).trim();
  const [width, height] = output.split(/\s+/).map(Number);
  assert(width > 0 && height > 0, `image cannot be decoded: ${relative(projectRoot, path)}`);
  assert(
    Math.max(width, height) <= maximumEdge,
    `image exceeds ${maximumEdge}px: ${relative(projectRoot, path)} (${width}x${height})`
  );
}

function inspectVideo(path) {
  const probe = JSON.parse(execFileSync(
    '/opt/homebrew/bin/ffprobe',
    ['-v', 'error', '-show_streams', '-of', 'json', path],
    { encoding: 'utf8' }
  ));
  const video = probe.streams.find((stream) => stream.codec_type === 'video');
  const audio = probe.streams.find((stream) => stream.codec_type === 'audio');
  const file = readFileSync(path);
  const moovPosition = file.indexOf(Buffer.from('moov'));
  const mdatPosition = file.indexOf(Buffer.from('mdat'));

  assert(video, `video stream is missing: ${relative(projectRoot, path)}`);
  assert(audio, `audio stream is missing: ${relative(projectRoot, path)}`);
  assert(video.codec_name === 'h264', `video must be H.264: ${relative(projectRoot, path)}`);
  assert(video.pix_fmt === 'yuv420p', `video must use yuv420p: ${relative(projectRoot, path)}`);
  assert(video.width === 1280 && video.height === 720, `video must be 1280x720: ${relative(projectRoot, path)}`);
  assert(audio.codec_name === 'aac', `audio must be AAC: ${relative(projectRoot, path)}`);
  assert(moovPosition > 0 && mdatPosition > 0 && moovPosition < mdatPosition, `video is not faststart: ${relative(projectRoot, path)}`);
}

const calendarDirectory = join(assetsRoot, 'images', 'calendars');
const recordDirectory = join(assetsRoot, 'images', 'records');
const donationDirectory = join(assetsRoot, 'images', 'donation');
const posterDirectory = join(assetsRoot, 'video', 'posters');
const videoDirectory = join(assetsRoot, 'video');
const puzzleImages = [
  's9-good-life-base.webp',
  's9-good-life-walk-a.webp',
  's9-good-life-walk-b.webp'
].map((name) => join(assetsRoot, 'images', 'scenes', name));
const quizImages = [
  'quiz1-agricultural-tax.webp',
  'quiz2-poverty-relief.webp'
].map((name) => join(assetsRoot, 'images', 'scenes', name));
const calendarNames = Array.from({ length: 40 }, (_, index) => `${1987 + index}.jpg`);
const recordNames = [
  's4-1987.jpg', 's5-1990.jpg', 's6-2006.jpg',
  's7-2001.jpg', 's7-2004.jpg', 's7-2015.jpg', 's7-2020.jpg',
  's8-1990.jpg', 's8-2000.jpg', 's8-2010.jpg', 's8-2020.jpg'
];
const donationNames = ['02.jpg', '03.jpg', '04.jpg', '05.jpg', '06.jpg'];
const posterNames = ['s3-intro.jpg', 's5-tv.jpg', 's6-tax.jpg'];
const videoNames = ['s3-intro.mp4', 's5-tv.mp4', 's6-tax.mp4'];

expectFiles(calendarDirectory, calendarNames, 'calendar thumbnails');
expectFiles(recordDirectory, recordNames, 'record images');
expectFiles(donationDirectory, donationNames, 'donation images');
expectFiles(posterDirectory, posterNames, 'video posters');

calendarNames.forEach((name) => identifyImage(join(calendarDirectory, name), 480));
recordNames.forEach((name) => identifyImage(join(recordDirectory, name), 1600));
donationNames.forEach((name) => identifyImage(join(donationDirectory, name), 1600));
posterNames.forEach((name) => identifyImage(join(posterDirectory, name), 960));
puzzleImages.forEach((path) => {
  assert(existsSync(path), `screen 9 puzzle image is missing: ${relative(projectRoot, path)}`);
  identifyImage(path, 1600);
});
quizImages.forEach((path) => {
  assert(existsSync(path), `quiz image is missing: ${relative(projectRoot, path)}`);
  identifyImage(path, 1600);
});
videoNames.forEach((name) => inspectVideo(join(videoDirectory, name)));

const files = walk(assetsRoot);
const images = files.filter((path) => ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(path).toLowerCase()));
const videos = files.filter((path) => extname(path).toLowerCase() === '.mp4');
const imageBytes = totalBytes(images);
const videoBytes = totalBytes(videos);
const deployBytes = totalBytes(walk(projectRoot));

if (imageBytes > 10 * 1024 * 1024) {
  throw new Error(`production images exceed 10MB: ${(imageBytes / 1024 / 1024).toFixed(2)}MB`);
}

if (videoBytes > 28 * 1024 * 1024) {
  throw new Error(`production videos exceed 28MB: ${(videoBytes / 1024 / 1024).toFixed(2)}MB`);
}

if (deployBytes > 42 * 1024 * 1024) {
  throw new Error(`deploy directory exceeds 42MB: ${(deployBytes / 1024 / 1024).toFixed(2)}MB`);
}

console.log(`Images: ${(imageBytes / 1024 / 1024).toFixed(2)}MB`);
console.log(`Videos: ${(videoBytes / 1024 / 1024).toFixed(2)}MB`);
console.log(`Deploy directory: ${(deployBytes / 1024 / 1024).toFixed(2)}MB`);
console.log('Asset verification passed.');
