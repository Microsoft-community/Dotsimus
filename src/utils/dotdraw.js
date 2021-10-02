const Canvas = require('canvas');
const path = require('path');

/**
 * Generate a dotcoin saying something image
 * @param {string} text The text to display. Prefer very tiny texts!
 * @param {[r, g, b]} color Text color to use (byte, values from 0 to 255)
 * @return Output image buffer
 */
async function drawDot(text, color = [0, 0, 0]) {
    const template = await Canvas.loadImage(path.join(__dirname, config.template));

    // use the template dimensions
    const canvas = Canvas.createCanvas(template.width, template.height);
    const context = canvas.getContext('2d');
    context.drawImage(template, 0, 0, template.width, template.height);

    // calculate the dimension for writing the text
    const boxArea = getBoxArea(canvas, template);
    const boxDelta = getBoxDelta(boxArea);

    // fillStyle requires HTML # color
    const htmlColor = rgbToHex(color);

    dimensions = [];
    context.font = getFontSize(context, boxDelta, config.font, text, dimensions);
    context.fillStyle = htmlColor;

    // calculate the position to make the text centered to the box area
    const textOffset = calculateCenter(boxDelta, dimensions);

    context.fillText(text, boxArea[0][0] + textOffset[0], boxArea[0][1] + textOffset[1]);

    return canvas.toBuffer();
}

function calculateCenter(boxDelta, dimensions) {
    const widthRemaining = boxDelta[0] - dimensions[0];
    const heightRemaining = boxDelta[1] - dimensions[1];
    const heightOffset = dimensions[1] - dimensions[2];

    // position of characters starts from the left bottom
    const widthDeltaCenter = widthRemaining / 2.0;
    const heightDeltaCenter = heightRemaining / 2.0 + heightOffset;

    return [widthDeltaCenter, heightDeltaCenter];
}

function getFontSize(context, boxDelta, font, text, dimensions) {
    // get the starting font size
    // the text must fit both horizontally and vertically
    const maxFontSize = boxDelta[0] < boxDelta[1] ? boxDelta[0] : boxDelta[1];
    let fontSize = maxFontSize;
    let nextSize = fontSize;
    let measured, measuredHeight;

    do {
        fontSize = nextSize;
        context.font = `${fontSize}px ${font}`;
        nextSize -= config.reduceSize;

        measured = context.measureText(text);
        // calculate the height bound
        measuredHeight = measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent
    } while (measured.width > boxDelta[0] || measuredHeight > boxDelta[1]);

    dimensions[0] = measured.width;
    dimensions[1] = measuredHeight;
    // sometimes letters like 'p' are a bit off center, so keep the 'descent' information
    dimensions[2] = measured.actualBoundingBoxDescent;

    return context.font;
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
  
function rgbToHex(color) {
    return "#" + componentToHex(color[0]) + componentToHex(color[1]) + componentToHex(color[2]);
}

function getBoxArea(canvas, template) {
    if (canvas.width === template.width && canvas.height === template.height) {
        return config.boxArea;
    } else {
        const widthRatio = canvas.width / template.width;
        const heightRatio = canvas.height / template.height;

        let boxArea = [[config.boxArea[0][0], config.boxArea[0][1]], [config.boxArea[1][0], config.boxArea[1][1]]];
        // resize the area to the canvas
        boxArea[0][0] *= widthRatio;
        boxArea[1][0] *= widthRatio;
        boxArea[0][1] *= heightRatio;
        boxArea[1][1] *= heightRatio;

        return boxArea;
    }
}

function getBoxDelta(boxArea) {
    return [
        boxArea[1][0] - boxArea[0][0],
        boxArea[1][1] - boxArea[0][1]
    ];
}

const config = {
    template: '../../assets/img/template.png',
    // [minArea] [maxArea]
    boxArea: [[775, 75], [1455, 530]],
    reduceSize: 10,
    font: 'sans-serif'
}

module.exports = {
    drawDot
}
