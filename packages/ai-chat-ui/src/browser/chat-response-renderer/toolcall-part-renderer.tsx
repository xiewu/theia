// *****************************************************************************
// Copyright (C) 2024 EclipseSource GmbH.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ChatResponsePartRenderer } from '../chat-response-part-renderer';
import { injectable } from '@theia/core/shared/inversify';
import { ChatResponseContent, ToolCallChatResponseContent } from '@theia/ai-chat/lib/common';
import { ReactNode } from '@theia/core/shared/react';
import { nls } from '@theia/core/lib/common/nls';
import * as React from '@theia/core/shared/react';

@injectable()
export class ToolCallPartRenderer implements ChatResponsePartRenderer<ToolCallChatResponseContent> {

    canHandle(response: ChatResponseContent): number {
        if (ToolCallChatResponseContent.is(response)) {
            return 10;
        }
        return -1;
    }

    render(response: ToolCallChatResponseContent): ReactNode {
        return (
            <h4 className='theia-toolCall'>
                {response.finished ? (
                    <details>
                        <summary>{nls.localize('theia/ai/chat-ui/toolcall-part-renderer/finished', 'Ran')} {response.name}
                            ({this.renderCollapsibleArguments(response.arguments)})
                        </summary>
                        <pre>{this.tryPrettyPrintJson(response)}</pre>
                    </details>
                ) : (
                    <span>
                        <Spinner /> {nls.localizeByDefault('Running')} {response.name}({this.renderCollapsibleArguments(response.arguments)})
                    </span>
                )}
            </h4>
        );
    }

    protected renderCollapsibleArguments(args: string | undefined): ReactNode {
        if (!args || !args.trim() || args.trim() === '{}') {
            return undefined;
        }

        return (
            <details className="collapsible-arguments">
                <summary className="collapsible-arguments-summary">...</summary>
                <span>{this.prettyPrintArgs(args)}</span>
            </details>
        );
    }

    private prettyPrintArgs(args: string): string {
        try {
            return JSON.stringify(JSON.parse(args), undefined, 2);
        } catch (e) {
            // fall through
            return args;
        }
    }

    private tryPrettyPrintJson(response: ToolCallChatResponseContent): string | undefined {
        let responseContent = response.result;
        try {
            if (responseContent) {
                if (typeof responseContent === 'string') {
                    responseContent = JSON.parse(responseContent);
                }
                responseContent = JSON.stringify(responseContent, undefined, 2);
            }
        } catch (e) {
            if (typeof responseContent !== 'string') {
                responseContent = nls.localize(
                    'theia/ai/chat-ui/toolcall-part-renderer/prettyPrintError',
                    "The content could not be converted to string: '{0}'. This is the original content: '{1}'.",
                    e.message,
                    responseContent
                );
            }
            // fall through
        }
        return responseContent;
    }
}

const Spinner = () => (
    <i className="fa fa-spinner fa-spin"></i>
);
