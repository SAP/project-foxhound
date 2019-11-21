node ('master') {
    def uniqueId = UUID.randomUUID().toString()
    def imageName = 'ubuntu' //can be any image you want to execute
   
    podTemplate(
        name: env.jaas_owner + '-jaas',
        label: uniqueId, 
        containers: [
            // Custom JNLP docker slave needs to be defined in each podTemplate
            containerTemplate(
                name: 'jnlp', 
                image: 'docker.wdf.sap.corp:50001/sap-production/jnlp-alpine:3.26.1-sap-02',
                args: '${computer.jnlpmac} ${computer.name}'
            ),

            containerTemplate (
                name: 'container-exec', 
                image: imageName,
                // The container needs a long-running command to stay alive 
                // until all containers in the pod are pulled and started.
                // Hence a pre-configured ENTRYPOINT in a docker images
                // will be overwritten. This needs to be considered for the 
                // execution of the shell block in the container.
                command: '/usr/bin/tail -f /dev/null',
            )
        ]
    )
    {
        node (uniqueId) {
            env.SHELL = "/bin/bash"
            echo "Execute container content in Kubernetes pod"        
            container('container-exec') {
              
                stage('Slave Prepare') { 
                    // unstash content from Jenkins master workspace
                    sh  """
                        apt-get update &&    \
                        apt-get install -y   \
                        wget         \
                        python       \
                        autoconf2.13 \
                        mercurial \
                        ccache \
                        libnspr4-dev \
                        software-properties-common \
                        git
                        """
                }

                stage('Checkout') {
                    checkout([$class: 'GitSCM',
                        branches: [[name: '*/master']],
                        extensions: [[$class: 'CloneOption', timeout: 120]],
                        gitTool: 'Default',
                        depth: "1",
                        userRemoteConfigs: [[url: 'https://github.wdf.sap.corp/WebSecResearch/taintfox.git']]
                    ])
                }

                stage('Bootstrap') {
                    sh """#!/bin/bash
                          [ -s "$HOME/.nvm/nvm.sh" ] && \\. "$HOME/.nvm/nvm.sh"
			  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain 1.38.0
                          ./mach bootstrap --application-choice=browser --no-interactive 
                    """
                }
                
                stage('Build') {
                    sh "cp taintfox_mozconfig_ubuntu .mozconfig"
                    sh  """#!/bin/bash
                          [ -s "$HOME/.nvm/nvm.sh" ] && \\. "$HOME/.nvm/nvm.sh"
                          ./mach build
                        """
                }
                
                stage('Package') {
                    sh """#!/bin/bash
                          [ -s "$HOME/.nvm/nvm.sh" ] && \\. "$HOME/.nvm/nvm.sh"
                          ./mach package
                    """
                }
            }
            
            stage('Slave Cleanup') {
		        archiveArtifacts artifacts: 'obj-tf-release/dist/taintfox-*.tar.bz2', fingerprint: true
			archiveArtifacts artifacts: 'obj-tf-release/dist/jsshell-*.zip', fingerprint: true
            }
        }
    }
}
