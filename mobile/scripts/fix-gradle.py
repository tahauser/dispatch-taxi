import subprocess, re, os

# Run expo prebuild
result = subprocess.run(['npx', 'expo', 'prebuild', '--platform', 'android'], check=True)

# Fix gradle version
f = 'android/gradle/wrapper/gradle-wrapper.properties'
content = open(f).read()
content = re.sub(r'gradle-[0-9.]+-bin\.zip', 'gradle-8.10.2-bin.zip', content)
open(f, 'w').write(content)
print('Gradle version patched to 8.10.2')
