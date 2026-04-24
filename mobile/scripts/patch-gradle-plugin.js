#!/usr/bin/env node
// Workaround: le build composite @react-native/gradle-plugin n'a pas de gradle.properties.
// Sans ce fichier, le Kotlin compiler tourne en mode worker (GradleCompilerRunnerWithWorkers)
// avec un heap limité, causant un "Internal compiler error" sur le settings-plugin de RN 0.79.
const fs = require('fs');
const path = require('path');

const pluginDir = path.join(__dirname, '..', 'node_modules', '@react-native', 'gradle-plugin');
const propsPath = path.join(pluginDir, 'gradle.properties');

if (!fs.existsSync(pluginDir)) {
  console.log('patch-gradle-plugin: @react-native/gradle-plugin not found, skipping.');
  process.exit(0);
}

const content = [
  'kotlin.compiler.execution.strategy=in-process',
  'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m',
  '',
].join('\n');

fs.writeFileSync(propsPath, content, 'utf8');
console.log('patch-gradle-plugin: gradle.properties written to', propsPath);
