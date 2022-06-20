import pandas as pd
import numpy as np
from matplotlib import pyplot as plt
import random,json
from run_model_checking import probability_of_trace

from matplotlib import rc
from matplotlib import pyplot as plt

plt.rcParams.update({'font.size': 18, 'axes.labelsize':18})
rc('font', **{'family': 'serif', 'serif': ['Computer Modern']})
rc('text', usetex=True)

def get_max_concurrent_points(df):
    assert ('dist' in df.columns)
    assert ('prob' in df.columns)
    distances = df.dist.unique()
    sizes = df.prob.unique()

    max_concurrent = 0
    for d in distances:
        for s in sizes:

            max_concurrent = max(max_concurrent, df[(df.dist == d) & (df.prob == s)].shape[0])
    return max_concurrent

def make_plot(plot_df):
    # load data to plot from experiments
    # plot_df = pd.read_csv('plot_df_2.csv')

    df = plot_df.copy()
    distances = df.dist.unique()
    sizes = df.prob.unique()

    n = get_max_concurrent_points(df)

    df2 = pd.DataFrame(columns=df.columns)

    df_list = [df2.copy() for i in range(n)]

    for i in range(n):
        for d in distances:
            for s in sizes:
                new_row = df[(df.dist == d) & (df.prob == s)].tail(1)
                if new_row.shape[0] == 1:
                    # df_list[i] = df_list[i].append(new_row)
                    df_list[i] = pd.concat([df_list[i], new_row], axis=0, join='outer')
                    idx = new_row.index[0]
                    df = df.drop(idx)

    start_alpha = 0.5
    end_alpha = 0.75
    alphas = [start_alpha + k*(end_alpha - start_alpha)/max(n-1,1) for k in range(n)]

    color_risk = np.array([0,0.6,0.1])
    color_benf = np.array([0.9,0.4,0.1])

    fig, ax = plt.subplots()
    for i in range(n):
        dists = df_list[i]['dist']
        risks = df_list[i]['risk_ineff']
        benfs = df_list[i]['ben_ineff']
        sizes = 5000*df_list[i]['prob'].astype(float)
        ax.scatter(dists, risks, s=sizes,color=color_risk, vmin=0, marker = 'o', vmax=100, alpha=alphas[i])
        ax.scatter(dists, benfs, s=sizes,color=color_benf, vmin=0, marker = 's', vmax=100, alpha=alphas[i])
    ax.set(xlim=(-1, 7), xticks=np.arange(0, 7),
           ylim=(0, 1))
    ax.legend(['Risk Inefficiency','Benefit Inefficiency'])
    ax.set(xlabel=r'Distance to $\tau_{\mathrm{fact}}$')
    ax.set(ylabel=r'Inefficiency')

    plt.savefig('plot.pdf', bbox_inches='tight')
    plt.show()

def compute_inefficiencies(df):
    with open('data/strategies.json', 'r') as fp:
        strategy_xi = json.load(fp)[0]
    with open('data/traces.json', 'r') as fp:
        tr_dict = json.load(fp)
        traces = tr_dict['traces']
        traces_distances = tr_dict['distances']
    trace_probs = [probability_of_trace(trace) for trace in traces]
    plot_df = pd.DataFrame(columns=['trace', 'risk_ineff', 'ben_ineff', 'prob', 'dist'])
    for i in range(len(traces)):
        dof = df[df.trace==i]
        rhoPxi = float(dof.loc[dof.strat == strategy_xi, 'rhoP'])
        rhoRxi = float(dof.loc[dof.strat == strategy_xi, 'rhoR'])
        risk_ineff = 0
        benf_ineff = 0
        for j in dof.index:
            if dof.loc[j,'rhoP'] <= rhoPxi:
                benf_ineff = max(benf_ineff, dof.loc[j,'rhoR']-rhoRxi)
            if dof.loc[j,'rhoR'] >= rhoRxi:
                risk_ineff = max(risk_ineff, rhoPxi - dof.loc[j,'rhoP'])
        new_row = pd.DataFrame.from_dict({'index':0,'trace':[i], 'risk_ineff': [risk_ineff], 'ben_ineff':[benf_ineff],
                                  'prob':[trace_probs[i]], 'dist':[traces_distances[i]]})
        plot_df = pd.concat([plot_df,new_row], axis=0, join='outer', ignore_index=True)
    return plot_df


def main():
    raw_data_df = pd.read_csv('data/raw_data.csv')
    plot_df = compute_inefficiencies(raw_data_df)
    make_plot(plot_df)


if __name__ == "__main__":
    main()
