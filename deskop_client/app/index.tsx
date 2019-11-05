import React from 'react';
import ReactDOM from 'react-dom';

class HelloMessage extends React.Component<any> {

    render() {
        this.getData();

        return <div>
            <div className="container">
                <h1>Hello {this.props.name}</h1>
            </div>
        </div>;
    }
}

let App = document.getElementById('app');

ReactDOM.render(<HelloMessage name="Lars"/>, App);
