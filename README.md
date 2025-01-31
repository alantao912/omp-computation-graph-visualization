# OpenMP Computation Graph Visualization

This repository is part of the broader work [Visualizing Correctness Issues in OpenMP Programs](https://link.springer.com/chapter/10.1007/978-3-031-72567-8_11)
and contains the visualization component.

## Overview

The user interface is shown below:

![alt text](https://github.com/alantao912/omp-computation-graph-visualization/blob/main/assets/tutorial.png?raw=true)

1. Computation graph display:
    - Each node corresponds to an OpenMP task.
    - Racy nodes are highlighted in red.
    - Task nodes are annotated with line number corresponding to creation.
2. Source code for first thread involved in data race.
    - Task creation directives are highlighted in yellow.
    - Unordered memory accesses are highlighted in red.
3. Source code for second thread involved in data race.
4. Legend.
5. Navigation buttons.
6. Stack information.

## Usage
Running our visualization tool is simple:
1. Double-click index.html to open the visualization in a browser.
2. Select 'Upload File'
3. Upload runtime data.

## Acknowledgements

This work was developed in collaboration with Feiyang Jin, Lechen Yu, and Vivek Sarkar.