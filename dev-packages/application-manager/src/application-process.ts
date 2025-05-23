// *****************************************************************************
// Copyright (C) 2017 TypeFox and others.
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

import * as path from 'path';
import * as fs from 'fs-extra';
import * as cp from 'child_process';
import { ApplicationPackage } from '@theia/application-package';

export class ApplicationProcess {

    protected readonly defaultOptions = {
        cwd: this.pck.projectPath,
        env: process.env
    };

    constructor(
        protected readonly pck: ApplicationPackage,
        protected readonly binProjectPath: string
    ) { }

    spawn(command: string, args?: string[], options?: cp.SpawnOptions): cp.ChildProcess {
        return cp.spawn(command, args || [], Object.assign({}, this.defaultOptions, {
            ...options,
            shell: true
        }));
    }

    fork(modulePath: string, args?: string[], options?: cp.ForkOptions): cp.ChildProcess {
        return cp.fork(modulePath, args, Object.assign({}, this.defaultOptions, options));
    }

    canRun(command: string): boolean {
        const binPath = this.resolveBin(this.binProjectPath, command);
        return !!binPath && fs.existsSync(binPath);
    }

    run(command: string, args: string[], options?: cp.SpawnOptions): Promise<void> {
        const commandProcess = this.spawnBin(command, args, options);
        return this.promisify(command, commandProcess);
    }

    spawnBin(command: string, args: string[], options?: cp.SpawnOptions): cp.ChildProcess {
        const binPath = this.resolveBin(this.binProjectPath, command);
        if (!binPath) {
            throw new Error(`Could not resolve ${command} relative to ${this.binProjectPath}`);
        }
        return this.spawn(binPath, args, {
            ...options,
            shell: true
        });
    }

    protected resolveBin(rootPath: string, command: string): string | undefined {
        let commandPath = path.resolve(rootPath, 'node_modules', '.bin', command);
        if (process.platform === 'win32') {
            commandPath = commandPath + '.cmd';
        }
        if (fs.existsSync(commandPath)) {
            return commandPath;
        }
        const parentDir = path.dirname(rootPath);
        if (parentDir === rootPath) {
            return undefined;
        }
        return this.resolveBin(parentDir, command);
    }

    protected promisify(command: string, p: cp.ChildProcess): Promise<void> {
        return new Promise((resolve, reject) => {
            p.stdout!.on('data', data => this.pck.log(data.toString()));
            p.stderr!.on('data', data => this.pck.error(data.toString()));
            p.on('error', reject);
            p.on('close', (code, signal) => {
                if (signal) {
                    reject(new Error(`${command} exited with an unexpected signal: ${signal}.`));
                    return;
                }
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`${command} exited with an unexpected code: ${code}.`));
                }
            });
        });
    }

}
