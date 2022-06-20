import pandas as pd
import numpy as np
import subprocess, copy, yaml
from tqdm import tqdm
from matplotlib import pyplot as plt
import random,json
import re


def sigma_for_bob(bob):
    if bob == 0:
        return 0
    if bob == 1:
        return 90
    if bob == 2:
        return 30
    if bob == 3:
        return 5
    assert(False)
    return

def check_one_state(initBob, initSigma, initGuard, initTime, openDoor):
    props_folder = "properties_files"
    model_folder = "prism_models"
    with open(f"{model_folder}/casestudy_mdp.prism", 'r') as fp:
        base_mdp = fp.read().split('\n')[7:]
    with open(f"{model_folder}/casestudy_dtmc.prism", 'r') as fp:
        base_dtmc = fp.read().split('\n')[10:]

    init_values = ""
    init_values += f"formula openDoor = {openDoor};\n"
    init_values += f"const int initBob = {initBob};\n"
    init_values += f"const int initSigma = {initSigma};\n"
    init_values += f"const int initGuard = {initGuard};\n"
    init_values += f"const int initTime = {initTime};\n"

    to_check_mdp = f"mdp\n\n{init_values}"
    for i in base_mdp:
        to_check_mdp += f"{i}\n"
    to_check_dtmc = f"dtmc\n\n{init_values}"
    for i in base_dtmc:
        to_check_dtmc += f"{i}\n"

    prism_file_mdp = "aux_mdp.prism"
    prism_file_dtmc = "aux_dtmc.prism"

    with open(prism_file_mdp, 'w') as fp:
        fp.write(to_check_mdp)
    with open(prism_file_dtmc, 'w') as fp:
        fp.write(to_check_dtmc)
    ################
    ## Begin optimized
    ################
    props_file = f"{props_folder}/p_master_mdp.props"
    result = subprocess.run(args=[prism_executable, str(prism_file_mdp), str(props_file)],
                            stdout=subprocess.PIPE,  # capture output
                            encoding="utf-8",
                            check=True)
    output = result.stdout
    # print(output)
    res_expr = re.compile("Result: ([\d.]+)")
    results = res_expr.findall(output)
    result_pmin, result_pmax, result_rmax = results
    """result_position = output.rfind("Result: ")
    result_pmin = output[result_position:].split('Result: ')[1].split(' (')[0]
    result_pmax = 0.1 # to do
    result_rmax = 0.1 # to do"""

    props_file = f"{props_folder}/p_master_dtmc.props"
    result = subprocess.run(args=[prism_executable, str(prism_file_dtmc), str(props_file)],
                            stdout=subprocess.PIPE,  # capture output
                            encoding="utf-8",
                            check=True)
    output = result.stdout
    # print(output)
    res_expr = re.compile("Result: ([\d.]+)")
    results = res_expr.findall(output)
    result_pxi, result_rxi = results
    """result_position = output.rfind("Result: ")
    result_pxi = output[result_position:].split('Result: ')[1].split(' (')[0]
    result_rxi = 0.1 # todo """
    ################
    ## End optimized
    ################
#     props_file = f"{props_folder}/pmin.props"
#     result = subprocess.run(args=[prism_executable, str(prism_file_mdp), str(props_file)],
#                             stdout=subprocess.PIPE,  # capture output
#                             encoding="utf-8",
#                             check=True)
#     output = result.stdout
#     # print(output)
#     result_position = output.rfind("Result: ")
#     result_pmin = output[result_position:].split('Result: ')[1].split(' (')[0]
#
#     props_file = f"{props_folder}/pmax.props"
#     result = subprocess.run(args=[prism_executable, str(prism_file_mdp), str(props_file)],
#                             stdout=subprocess.PIPE,  # capture output
#                             encoding="utf-8",
#                             check=True)
#     output = result.stdout
# #     print(output)
#     result_position = output.rfind("Result: ")
# #     print(output[result_position:])
#     result_pmax = output[result_position:].split('Result: ')[1].split(' (')[0]
#
#     props_file = f"{props_folder}/rmax.props"
#     result = subprocess.run(args=[prism_executable, str(prism_file_mdp), str(props_file)],
#                             stdout=subprocess.PIPE,  # capture output
#                             encoding="utf-8",
#                             check=True)
#     output = result.stdout
#     # print(output)
#     result_position = output.rfind("Result: ")
#     result_rmax = output[result_position:].split('Result: ')[1].split(' (')[0]
#
#     props_file = f"{props_folder}/p.props"
#     result = subprocess.run(args=[prism_executable, str(prism_file_dtmc), str(props_file)],
#                             stdout=subprocess.PIPE,  # capture output
#                             encoding="utf-8",
#                             check=True)
#     output = result.stdout
#     # print(output)
#     result_position = output.rfind("Result: ")
#     result_pxi = output[result_position:].split('Result: ')[1].split(' (')[0]
#
#     props_file = f"{props_folder}/reward.props"
#     result = subprocess.run(args=[prism_executable, str(prism_file_dtmc), str(props_file)],
#                             stdout=subprocess.PIPE,  # capture output
#                             encoding="utf-8",
#                             check=True)
#     output = result.stdout
#     # print(output)
#     result_position = output.rfind("Result: ")
#     result_rxi = output[result_position:].split('Result: ')[1].split(' (')[0]
    ################
    ## End old
    ################

    return float(result_pmin), float(result_pmax), float(result_rmax), float(result_pxi), float(result_rxi)


def check_one_trace(trace, openDoor):
    df = pd.DataFrame(columns=['Pmin', 'Pmax', 'Pxi', 'rhoP', 'Rmin', 'Rmax', 'Rxi', 'rhoR'])
    for i in trace:
        aux = check_one_state(i['Bob'], sigma_for_bob(i['Bob']), i['Guard'], i['Time'], openDoor)
        auxdict = {'Pmin':aux[0], 'Pmax' : aux[1], 'Rmin': 0, 'Rmax':aux[2], 'Pxi':aux[3], 'Rxi':aux[4]}
        auxdict['rhoP']=(auxdict['Pxi']-auxdict['Pmin'])/(auxdict['Pmax']-auxdict['Pmin'])
        auxdict['rhoR']=(auxdict['Rxi']-auxdict['Rmin'])/(auxdict['Rmax']-auxdict['Rmin'])
        # df = df.append(auxdict,ignore_index=True)
        new_row = pd.DataFrame.from_dict([auxdict])
        df = pd.concat([df,new_row], axis=0, join='outer', ignore_index=True)
#     print(f'Overall risk: {df.Pxi.sum()/df.Pmax.sum()}')
#     print(f'Overall benefit: {df.Rxi.sum()/df.Rmax.sum()}\n')
    return df

def probability_of_trace(trace):
    prob = 1
    for i in range(len(trace)-1):
        state1 = trace[i]
        state2 = trace[i+1]
        new_prob = 1
        if (state1['Bob'] == 1):
            new_prob *= 0.1 if state2['Bob'] == 1 else 0.9
        elif (state1['Bob'] == 2):
            new_prob *= 0.1 if state2['Bob'] == 2 else 0.9
        else:
            new_prob *= 0.1 if state2['Bob'] == 0 else 0.9
        new_prob = new_prob/3 # guard transiton
        prob *= new_prob
    return prob



def main():
    global prism_executable
    with open("config.yml", "r") as yamlfile:
        data = yaml.load(yamlfile, Loader=yaml.FullLoader)
    prism_executable = data["prism_executable"]

    with open('data/strategies.json', 'r') as fp:
        strats = json.load(fp)
    with open('data/traces.json', 'r') as fp:
        tr_dict = json.load(fp)
        traces = tr_dict['traces']
        traces_distances = tr_dict['distances']
    trace_probs = [probability_of_trace(trace) for trace in traces]

    df = pd.DataFrame(columns=['trace', 'strat','rhoP', 'rhoR'])
    for i in tqdm(range(len(traces))):
        for strat in tqdm(strats):
            auxdf = check_one_trace(traces[i],strat)
            auxdict = {'trace' : i, 'strat' : strat, 'rhoP' : auxdf.Pxi.sum()/auxdf.Pmax.sum(),
                       'rhoR' : auxdf.Rxi.sum()/auxdf.Rmax.sum()}
            new_row = pd.DataFrame.from_dict([auxdict])
            df = pd.concat([df,new_row], axis=0, join='outer', ignore_index=True)

    df.to_csv('data/raw_data.csv')

if __name__ == "__main__":
    main()
