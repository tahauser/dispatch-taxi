import subprocess, re

# Run expo prebuild
subprocess.run(['npx', 'expo', 'prebuild', '--platform', 'android'], check=True)

# Fix gradle version
f = 'android/gradle/wrapper/gradle-wrapper.properties'
content = open(f).read()
content = re.sub(r'gradle-[0-9.]+-bin\.zip', 'gradle-8.10.2-bin.zip', content)
open(f, 'w').write(content)
print('Gradle version patched to 8.10.2')

# Fix build.gradle null pointer
f2 = 'android/app/build.gradle'
content2 = open(f2).read()
old = 'def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()'
new = 'def projectRootFile = rootDir.getAbsoluteFile().getParentFile()\ndef projectRoot = projectRootFile != null ? projectRootFile.getAbsolutePath() : rootDir.getAbsoluteFile().getAbsolutePath()'
content2 = content2.replace(old, new)
content2 = content2.replace('.execute(null, rootDir)', '.execute(null, rootDir.parentFile ?: rootDir)')
open(f2, 'w').write(content2)
print('build.gradle patched')
