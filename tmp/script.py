import os

file_path = "src/app/pages/Properties.tsx"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("className=\"w-full px-4 py-3 bg-muted dark:bg-[#1A2332] dark:text-[#E8EBF0] rounded-xl border-0 focus:ring-2 focus:ring-[#F5A623]\"", "className=\"w-full px-4 py-3 bg-muted dark:bg-[#1A2035] dark:text-[#C8D0E0] rounded-xl border-0 focus:ring-2 focus:ring-[#F5A623]\"")

with open(file_path, "w") as f:
    f.write(content)
