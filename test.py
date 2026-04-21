# import camelot
# import json
# import sys
# import io
# import os

# # Ensure stdout can handle UTF-8
# sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# # Get PDF and output paths from command-line arguments
# PDF_FILE = sys.argv[1] if len(sys.argv) > 1 else "InputExample11.pdf"
# OUT_FILE = sys.argv[2] if len(sys.argv) > 2 else "output.json"

# try:
#     tables = camelot.read_pdf(PDF_FILE, pages='all', flavor='lattice')

#     # Optional: print number of tables
#     print(f"Total tables found: {tables.n}")

#     final_dict = {}
#     current_key = None

#     for t in range(tables.n):
#         df = tables[t].df

#         for _, row in df.iterrows():
#             # ---------------- FIXED: do not break single character words --------------
#             row = [str(x).replace("\n","") for x in row]   # remove newline fully
#             row = [" ".join(x.strip().split()) for x in row]  # collapse extra spaces
#             # --------------------------------------------------------------------------

#             key = row[0]
#             rest = row[1:]

#             val = " ".join([x for x in rest if x])

#             non_empty_count = sum(1 for x in row if x)

#             if key:   # new key present in first column
#                 # Check if key might have a value concatenated to it (e.g., "Name of Family Physician NA")
#                 # Only split if no value exists in the row and we're CERTAIN it's a value
#                 key_parts = key.split()
#                 potential_key = key
#                 potential_val = val
                
#                 # Common key words that should NEVER be split from keys
#                 # These are legitimate parts of keys, not values
#                 key_words = ["remarks", "findings", "copy", "background", "patient", "by", "etc.", 
#                             "etc", "details", "name", "address", "number", "no", "date", "time",
#                             "check", "visit", "verification", "screenshot", "attached", "attach"]
                
#                 # If no value in row and key has multiple words, check if last word(s) might be a value
#                 # Handle both 2-word keys (like "Qualification NA") and longer keys
#                 if not val and len(key_parts) >= 2:
#                     last_word = key_parts[-1]
#                     last_two = " ".join(key_parts[-2:]) if len(key_parts) >= 4 else ""
                    
#                     # ONLY split for very specific value patterns - be very conservative
#                     # 1. Known short value patterns
#                     short_values = ["NA", "N/A", "YES", "NO", "Yes", "No", "n/a", "na" ]
                    
#                     # 2. Very short uppercase words (1-3 chars) that are likely values
#                     is_short_upper_value = (len(last_word) <= 3 and last_word.isupper() and 
#                                            last_word not in ["NO", "YES", "N/A", "NA"])  # Already handled above
                    
#                     # 3. "In House" pattern (specific known value phrase)
#                     is_in_house = last_two and last_two.lower().replace("-", " ") == "in house"
                    
#                     # Check if last word is a known value (and NOT a key word)
#                     # For 2-word keys, be more careful - only split if it's a clear value
#                     if last_word in short_values:
#                         # Always split known values like "NA", "YES", "NO"
#                         potential_key = " ".join(key_parts[:-1])
#                         potential_val = last_word
#                     # Check for "In House" pattern (requires at least 4 words total)
#                     elif is_in_house and len(key_parts) >= 4:
#                         potential_key = " ".join(key_parts[:-2])
#                         potential_val = last_two
#                     # For 2-word keys, don't split unless it's a known value (already handled above)
#                     # For longer keys, check for very short uppercase values (but not if it's a key word)
#                     elif len(key_parts) >= 3 and is_short_upper_value and last_word.lower() not in [w.lower() for w in key_words]:
#                         potential_key = " ".join(key_parts[:-1])
#                         potential_val = last_word
#                     # DO NOT split for lowercase words - they're likely part of the key
#                     # (like "remarks", "findings", "copy", etc.)
                
#                 # This is a proper key - set it as current_key
#                 current_key = potential_key

#                 if current_key in final_dict:
#                     i = 2
#                     new_key = f"{current_key}_{i}"
#                     while new_key in final_dict:
#                         i += 1
#                         new_key = f"{current_key}_{i}"
#                     current_key = new_key

#                 # Set the value for this key (use extracted value if available)
#                 final_dict[current_key] = potential_val

#             else:
#                 # First column is empty - this is a continuation row
#                 # NEVER create new keys from values in second column
#                 # Always append to current_key's value if we have one
#                 if current_key:
#                     # We have a current key - append value to it (if value exists)
#                     if val:
#                         if final_dict.get(current_key, ""):
#                             final_dict[current_key] += " " + val
#                         else:
#                             final_dict[current_key] = val
#                         final_dict[current_key] = " ".join(final_dict[current_key].split())
#                     # If val is empty, do nothing - keep current_key for next row
#                 # If no current_key exists and first column is empty, skip this row
#                 # Don't create keys from values in second column

#     # Save JSON with all keys lowercased
#     lowercased_dict = {str(k).lower(): v for k, v in final_dict.items()}
#     with open(OUT_FILE, 'w', encoding='utf-8') as f:
#         json.dump(lowercased_dict, f, ensure_ascii=False, indent=2)

#     # Clear, single confirmation message
#     print("PDF to JSON converted successfully ✅")

# except Exception as e:
#     print("ERROR:", e)
#     sys.exit(1)




import camelot
import json
import sys
import io
import re

# Ensure stdout can handle UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PDF_FILE = sys.argv[1] if len(sys.argv) > 1 else "InputExample11.pdf"
OUT_FILE = sys.argv[2] if len(sys.argv) > 2 else "output.json"

# ─── Known Keys (all lowercase) ───────────────────────────────────────────────
# If a cell matches one of these, we split exactly at the key boundary.
# For any NEW unknown key, the fallback heuristic handles it automatically.
KNOWN_KEYS = sorted([
    "case assigned by",
    "name of insurance company",
    "assigned date",
    "report submission date",
    "policy no",
    "clid / claim id /ccn no./",
    "claim no",
    "claim type",
    "patient name",
    "patient age",
    "patient dob",
    "gender",
    "policy inception date",
    "policy age",
    "corporate/retail",
    "name of corporate",
    "other details",
    "residence address",
    "residence contact no",
    "email address of patient/insured",
    "hospital details",
    "hospital name.",
    "address.",
    "registration no",
    "hospital is registered on the name of ( as per registration certificate)",
    "total no of beds",
    "doa",
    "dod",
    "presenting complains",
    "past history",
    "diagnosis",
    "line of treatment",
    "test advised",
    "final bill of hospital",
    "indoor case paper observation",
    "hospital visit remarks",
    "ipd register entry",
    "tariff list",
    "any mismatch in the tariff list and final bill",
    "carbon copy of the bill",
    "payment receipt copy",
    "ot register copy",
    "hospital visit findings.",
    "treating doctor details",
    "treating doctor name",
    "qualification",
    "registration number",
    "maharashtra medical council verification ( attach screenshot )",
    "maharashtra medical council verification ( attach screenshot)",
    "national medical commission (nmc) verification (attach screenshot )",
    "mobile no.",
    "met treating doctor personally yes or no ?",
    "details of statement issued by treating doctor visit findings",
    "any discrepancy / background",
    "pathology details",
    "pathology center name",
    "pathology manual register & visit findings",
    "pathologist doctor",
    "pathologist doctor name",
    "qualification of pathologist",
    "met pathologist doctor personally yes or no ?",
    "details of statement issued by pathologist doctor visit findings",
    "pharmacy details",
    "pharmacy name",
    "pharmacy address complete",
    "licensee number",
    "bill verification findings",
    "pharmacy visit findings",
    "radiology center",
    "radiology center name",
    "radiology center address.",
    "radiology manual register & other findings – visting findings",
    "radiologist doctor name",
    "med radiologist personally",
    "details of statement issued by radiologist / visit findings",
    "distance check",
    "distance from (in kms)",
    "pathology lab",
    "medical store",
    "statement from patient",
    "complain history",
    "no. of days hospitalized",
    "total cost of treatment",
    "date & time of admission",
    "date & time of discharge",
    "remarks",
    "occupation of patient",
    "company / organization name of patient",
    "work place address",
    "contact no",
    "family physician",
    "name of family physician",
    "visiting findings",
    "summary",
    "other insurance policy details",
    "vicinity check",
    "overall findings and details",
    "explanation of the trigger given by insurance company or tpa",
    "conclusion / recommendation",
    "refutable evidence",
    "disclaimer",
    "report submitted by",
    "social media check :- what's app, facebook, instagram, telegram, snapchat, twitter, linkedin, you tube, true caller, share chat, tiktok, moj etc.",
], key=len, reverse=True)  # longest first so more specific keys match before shorter ones


# ─── Utility ──────────────────────────────────────────────────────────────────

def try_known_key_split(cell_text):
    """
    Try to match the cell against known keys.
    Returns (key, value) if matched, or None if no match.
    """
    lower = cell_text.lower().strip()
    for known_key in KNOWN_KEYS:
        if lower.startswith(known_key):
            value_part = cell_text[len(known_key):].strip()
            return known_key, value_part
    return None


def try_heuristic_split(cell_text):
    """
    Fallback: try to guess where key ends and value begins for unknown keys.
    Strategy:
      - Words that look like values: short uppercase (NA, YES, NO), numbers, dates,
        or capitalized proper nouns after a lowercase key segment.
      - If we can't confidently split, return full text as key with empty value.
    Returns (key, value).
    """
    key_lower = cell_text.lower().strip()
    words = cell_text.strip().split()

    if len(words) <= 1:
        return key_lower, ""

    # Pattern 1: Last word is a known short value token
    short_tokens = {"NA", "N/A", "Yes", "YES", "No", "NO", "na", "n/a", "yes", "no"}
    if words[-1] in short_tokens:
        key = " ".join(words[:-1]).lower()
        val = words[-1]
        return key, val

    # Pattern 2: Last word is a pure number or looks like a date (e.g. "6600", "21-01-2026")
    last = words[-1]
    if re.match(r'^\d[\d\-/,.]*$', last):
        key = " ".join(words[:-1]).lower()
        val = last
        return key, val

    # Pattern 3: Detect where lowercase key words end and Capitalized value words begin.
    # Walk words left to right. Key words are usually lowercase or title-case abbreviations.
    # Value starts when we see a capitalized proper noun AFTER at least 2 key words.
    split_index = None
    for i in range(2, len(words)):
        word = words[i]
        # If this word starts with uppercase and previous word was lowercase → likely value start
        if word[0].isupper() and words[i-1][0].islower():
            split_index = i
            break

    if split_index:
        key = " ".join(words[:split_index]).lower()
        val = " ".join(words[split_index:])
        return key, val

    # No confident split found → entire cell is the key
    return key_lower, ""


def split_cell(cell_text):
    """
    Main splitter. Tries known keys first, then falls back to heuristics.
    Always returns (key, value).
    """
    result = try_known_key_split(cell_text)
    if result:
        key, val = result
        # print(f"   [KNOWN KEY] '{key}' → '{val[:40]}'" if val else f"   [KNOWN KEY] '{key}'")
        return result

    key, val = try_heuristic_split(cell_text)
    # if val:
    #     print(f"   [NEW KEY - heuristic split] '{key}' → '{val[:40]}'")
    # else:
    #     print(f"   [NEW KEY] '{key}'")
    return key, val


# ─── Main ─────────────────────────────────────────────────────────────────────

try:
    tables = camelot.read_pdf(PDF_FILE, pages='all', flavor='lattice')
    print(f"Total tables found: {tables.n}")

    final_dict = {}
    current_key = None

    for t in range(tables.n):
        df = tables[t].df

        for _, row in df.iterrows():
            # Clean each cell
            row = [str(x).replace("\n", " ") for x in row]
            row = [" ".join(x.strip().split()) for x in row]

            first_cell = row[0]
            rest_cells = row[1:]
            rest_val = " ".join([x for x in rest_cells if x]).strip()

            if first_cell:
                extracted_key, extracted_val = split_cell(first_cell)

                # Value priority: rest of row first, then what was extracted from key cell
                value = rest_val if rest_val else extracted_val

                # Handle duplicate keys
                current_key = extracted_key
                if current_key in final_dict:
                    i = 2
                    new_key = f"{current_key}_{i}"
                    while new_key in final_dict:
                        i += 1
                        new_key = f"{current_key}_{i}"
                    current_key = new_key

                final_dict[current_key] = value

            else:
                # Continuation row — append to current key
                if current_key and rest_val:
                    existing = final_dict.get(current_key, "")
                    combined = (existing + " " + rest_val).strip()
                    final_dict[current_key] = " ".join(combined.split())

    # Save JSON
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_dict, f, ensure_ascii=False, indent=2)

    print("PDF to JSON converted successfully ✅")

except Exception as e:
    print("ERROR:", e)
    sys.exit(1)

    
