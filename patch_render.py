import re
with open('src/components/financial/RevenueTable.tsx', 'r') as f:
    text = f.read()

# Make the label bold and indented if it's a child or header
# If isHeader, we should disable the inputs or render them blank.
# Let's check RevenueTable structure.
