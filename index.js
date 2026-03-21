'use strict';
const path = require('path');

/**
 * Returns the absolute path to the html-slide-renderer package.
 * Use this in build scripts instead of hardcoding paths:
 *
 *   const { rendererRoot } = require('@shockproofai/shockproof-skills');
 *   const tpl = require(`${rendererRoot}/scripts/sai_html_template.js`)({ ... });
 */
const rendererRoot = path.join(__dirname, 'skills/shared/html-slide-renderer');

/**
 * Returns the absolute path to the create-html-deck skill root.
 * Output directories (mnt/outputs/) live here by default.
 */
const createHtmlDeckRoot = path.join(__dirname, 'skills/create-html-deck');

/**
 * Returns the absolute path to the convert-pdf-to-html-deck skill root.
 */
const convertPdfRoot = path.join(__dirname, 'skills/convert-pdf-to-html-deck');

module.exports = { rendererRoot, createHtmlDeckRoot, convertPdfRoot };
