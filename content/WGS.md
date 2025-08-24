---
title: Whole Genome Sequencing
draft: false
date: 2025-08-24
tags:
  - testing
---

> I advise against the trendy online direct-to-customer labs due to many issues (see below) and instead recommend finding a non-trendy local accredited lab that has thorough documentation on their processes and technology (or is willing to tell you in detail).

> NOTE: I will provide a sample email with the most important items you can send to labs at the end of this document.

## Basics
- sequencing depth: >30x
	- some like yseq offer 15x that is cheaper
	- deeper can work but it's gonna be a lot more data
- sample must be **blood** (or blood & **buccal swab**)
	- just saliva is usually not going to yield enough intact DNA and so poorer results especially for rare mutations (there was a study on this will find later if interested)
	- TODO link that study
- mtDNA is not always included by default so make sure to ask

## Miscellaneous
- ask about turnaround time if not documented
	- some labs (especially the trendy ones) can take arbitrarily long
- reasonable pricing is $1-2k
	- anything below is suspicious, anything above likely a rip-off

## Pre-processing
- library preparation: PCR-free
	- they should NOT use PCR amplification during sample preparation as this can cause inaccuracies/bias
- uses latest tech: NovaSeq 6000 or ideally X plus (but 6000 is already very good)
- q30 quality score of at least 85%, ideally better
- >10x depth coverage is >95% (ideally >98%)
- >30x depth coverage is >85% (ideally >92%)
- duplication rate: <10%
	- practically, this means that 
- does qualify control

## Post-processing
### Alignment
- preferred human genome reference: **GRCh38**
	- instead of hg19, which is outdated and doesn't map complex regions that well
- full analysis set with ALT contigs, ALT-aware alignment
- use **decoy/HLA contigs** (e.g., EBV)
	- reads aligning to non-human contigs should remain in the CRAM (not filtered out, in case relevant DNA pathogens are present)

### X/Y chromosome calling
- **male sex-aware calling:** X non-PAR = haploid, Y = haploid, PAR = diploid (correct handling of PAR regions)
- chrX/chrY variants should be included in the VCF

### mtDNA
- **heteroplasmy percentages**
- haplogroups (optional, but useful for lineage analysis)

## Files
> The files you need depend on whether you only want to analyze or also want have the option to rerun the whole post-processing pipeline later. I recommend you get both if possible, but e.g. if it's significantly cheaper to get files for analysis only, then you know what to get.

### Use case: analysis only (e.g. via Franklin)
- **VCF (SNV/indel) + index** – **REQUIRED**
	- > This is the main input Franklin and other analysis software consume.
	- **required headers:**
		- `##reference=` → **genome build ID** (e.g., GRCh38.p13) + chromosome naming (e.g., chr1, chrM)
		- `##source=`/**caller** → tool **name + version** (e.g., GATK 4.3.0 / DRAGEN 4.2		- **FILTER** definitions; **SAMPLE** ID; **sex** (in header or sample sheet)
- **VCF (SV/CNV) + index** – **REQUIRED**
	- > The SNV/indel (default VCF) only stores SNPs. For complex mutations you need SV/CNV, which includes structural variants (≥50 bp: deletions, duplications, insertions, inversions, translocations) - and copy number variants (dosage gains/losses).
	- **required eaders:** reference build ID; **SV caller name + version**; FILTERs; standard SV INFO tags (e.g., SVTYPE, END)
- **BAM + BAI** (for evidence review) – **recommended**
	- **required headers:**
		- @SQ with sequence names (and preferably M5 MD5 tags)
		- @PG with **aligner name + version**
		- @RG read groups (SM sample, LB library, PL platform, PU unit)

**Files you do not need for analysis but I would recommend anyway:**
- FASTQ (see below)
- **QC reports**: %Q30, **mapping %**, **dup % (post mark-dup)**, **mean depth**, **%≥10× / %≥30×**, **insert-size** stats
	- also useful for checking whether a rerun is necessary

### **Use case: rerun / realignment / re-calling**
> Some reasons you might want to rerun later: improved tooling in the future may pick up variants current technology does not, genome database gets updated, joint analysis with family members, fix lab choices if you can't get all the requirements listed here, etc.

#### Core files
* everything from above – **REQUIRED**
- **FASTQ (R1/R2, raw, unfiltered)** – **REQUIRED**
	- **required read group info (@RG):** SM (sample), LB (library), PL (platform), PU (unit), CN (center)
		- supply if not embedded
	- > Absolutely essential; all reprocessing starts here. For this reason I always recommend asking for the FASTQ file.
	- > Alternatively, can use BMA as optional starting point (saves you alignment time), but if you want to change reference/parameters, you’ll usually prefer to start from FASTQ. Also useful to compare against original alignment.
- **gVCF + index (per-sample)** – **recommended**
	- **required headers:** reference build; **caller name + version**; ploidy assumptions if noted
	- NOTE: this file will be quite large
	- > Enables joint (re)genotyping later without re-calling from scratch.
- **coverage files** (mosdepth BED/TSV/BigWig) – **recommended**
	- > To pinpoint low-coverage regions and reproducible from BAM.

#### Global metadata
> Essential for exact reproducibility or to interpret BAM/VCF correctly.
- **reference FASTA ID** - **REQUIRED**
	- **Exact filename** (e.g., GRCh38_full_analysis_set_plus_decoy_hla.fa)
	- **Checksum** (MD5/SHA256)
	- **Note** whether **ALT/decoy** present or if **hg38.primary** used
- **reference genome ID** - **REQUIRED**
	- Build label (e.g., **GRCh38.p13**) + chromosome naming scheme
- **known sites VCFs**
	- **dbSNP** + **Mills & 1000G indels** (filenames, versions, checksums)
- **toolchain versions**
	- **aligner:** name + version (e.g., BWA-MEM2 2.2.1 / DRAGEN aligner 4.2)
	- **SNV/indel caller:** name + version (e.g., GATK HC 4.3.0 / DeepVariant 1.6 / DRAGEN germline 4.2)
	- **SV/CNV caller(s):** name + version (e.g., Manta 1.6.0, gCNV)
	- **post-proc:** mark-dup tool/version (Picard/GATK/DRAGEN), **BQSR** tool/version + resource sets used
	- **VCF ops:** bcftools/htslib versions (if used)
- **checksums for deliverables**
	- MD5/SHA for FASTQ, BAM, VCF/gVCF, coverage/QC files
## Recommended analysis software
* Franklin
* TODO

## Recommended labs


### Labs to avoid
> There are group of online DTC labs that are often scammy, with unclear and sometimes outrageous delays, inaccuracies due to poor methodology, or simply because they only accept saliva samples as they are not local and this in itself can cause inaccuracies.

- Dante
- Sequencing
- TODO

Some anecdotes:
- TODO: cite anecdotes on inaccuracies/delays/scams of these labs

## Sample email

TODO