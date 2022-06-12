# Attribution of Intention to Autonomous Agents
# Supplementary Material

This folder contains all that is necessary to reproduce the plot shown in
Figure 3 (right).

### Requirements

The tool for doing model checking operations that was used is
[PRISM](http://www.prismmodelchecker.org/download.php)
model checker.
To run the code, `prism` has to be installed in the directory specified in line 5 of `run_model_checking.py`.

The tool requires python installed in the system.
It has been tested with python 3.8.5.
Other versions should also work.
To install python requirements:
```
pip install -r requirements.txt
```

### Structure
- **data/**:
  - *raw_data.csv*: contains the raw data produced by `run_model_checking.py` used to make the plots,
  -*traces.json*: contains the traces studied.
  The first one corresponds to the factual trace.
  -*strategies.json*: contains the strategies considered to compute inefficiencies.
  The first one is the actual strategy used by Alice, referred as $\xi$ in the paper.
-**prism_models/**: contains the models for the MDP described in the case study, in the PRISM language.
-**properties_files/**: contains the input for PRISM to know what to compute (probabilities, rewards).
-*plot_results.py*: Generates the plot from `data/raw_data.csv`. The execution takes less than a second.
-*run_model_checking.py*: Computes P_xi, P_min, P_max, R_xi, R_min and R_max for all traces in `data/traces.json` and all strategies in `data/strategies.json`.
With the provided strategies and traces, it takes 30min to run in a laptop
with Ubuntu 20.04, Intel Core i5-10210U CPU, 16GB of RAM.
-*run.sh*: Bash script to run the two python scripts sequentially.
-*requirements.txt*: List of pyhton requirements.

### Usage

To run the whole pipeline, in a shell:

```
bash run.sh
```

To produce the raw data (risks and benefits for every trace and strategy):
```
python3 run_model_checking.py
```

To produce the plot from the raw data:
```
python3 plot_results.py
```
