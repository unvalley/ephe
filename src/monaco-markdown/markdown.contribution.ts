/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerLanguage } from './contribution';
import {conf, language} from "./markdown";

export function activateMarkdownMath() {
	registerLanguage({
		id: 'markdown-math',
		extensions: ['.md', '.markdown', '.mdown', '.mkdn', '.mkd', '.mdwn', '.mdtxt', '.mdtext'],
		aliases: ['Markdown', 'markdown'],
		loader: () => {
			return Promise.resolve({
				conf: conf,
				language: language
			})
		}
	});
}
