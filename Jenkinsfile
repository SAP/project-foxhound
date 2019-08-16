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

            jdk = tool name: 'openjdk-12.0.1'
            env.JAVA_HOME = "${jdk}"

            echo "Execute container content in Kubernetes pod"        
            container('container-exec'){
              
                stage('Slave Prepare') { 
                    // unstash content from Jenkins master workspace
                    sh """
		       apt-get update &&    \
    		       apt-get install -y   \
		       wget         \
		       python       \
	    	       clang        \
	    	       llvm	 \
	    	       rustc        \
	    	       cargo        \
	    	       autoconf2.13 \
	    	       libgtk-3-dev \
	    	       libgconf2-dev \
	    	       libdbus-glib-1-dev \
	    	       libpulse-dev \
	    	       libnotify-bin \
	    	       yasm \
	    	       nasm \
	    	       mercurial \
	    	       ccache \
	    	       libnspr4-dev \
	    	       software-properties-common
		       """
		    sh """
		       cargo install cbindgen
		       """
		    sh """
		       wget -q https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh -O /tmp/install.sh && \
    		       bash /tmp/install.sh && \
		       rm /tmp/install.sh
		       """
		    sh """
		       source $HOME/.nvm/nvm.sh
		       nvm install node
		       """
		    sh """
		       wget -O /tmp/llvm-snapshot.gpg.key https://apt.llvm.org/llvm-snapshot.gpg.key && \
    		       apt-key add /tmp/llvm-snapshot.gpg.key && \
    		       apt-add-repository "deb http://apt.llvm.org/xenial/ llvm-toolchain-xenial-6.0 main" && \
    		       apt-get update && \
    		       apt-get install -y clang-6.0 && \
    		       apt-get remove -y clang && \
    		       update-alternatives --install /usr/bin/clang++ clang++ /usr/bin/clang++-6.0 1000 && \
    		       update-alternatives --install /usr/bin/clang clang /usr/bin/clang-6.0 1000 && \
    		       update-alternatives --config clang && \
    		       update-alternatives --config clang++
		       """
		    sh """
		       apt-get remove -y nasm && \
    		       mkdir -p /tmp/nasm && \
    		       cd /tmp/nasm && \
    		       wget -O /tmp/nasm/nasm.tar.gz https://www.nasm.us/pub/nasm/releasebuilds/2.14.02/nasm-2.14.02.tar.gz && \
    		       tar -xzvf /tmp/nasm/nasm.tar.gz && \
    		       cd /tmp/nasm/nasm-2.14.02 && \
    		       ./configure --prefix=/usr && \
    		       make install && \
    		       rm -rf /tmp/nasm
		       """
		    sh """
		       wget -q https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py -O /tmp/bootstrap.py && \
		       python /tmp/bootstrap.py --application-choice=browser --no-interactive || true && \
    		       rm /tmp/bootstrap.py
		       """
                }

		stage('Checkout') {
		    git 'https://github.wdf.sap.corp/WebSecResearch/taintfox.git'
		}
                 
                
                stage('Build') {
		    sh "cp taintfox_mozconfig_ubuntu .mozconfig"
                    sh "source $HOME/.nvm/nvm.sh && ./mach build"
                }
        
            }
            
            stage('Slave Cleanup') {
		archiveArtifacts artifacts: 'obj-tf-release/dist/taintfox-*.en-US.linux-x86_64.tar.bz2', fingerprint: true
            }
        }
    }
}